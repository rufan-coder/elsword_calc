// 스크린샷 한 장을 읽어 스탯 값을 돌려준다 (브라우저 전용).
// 글자 인식은 tesseract.js를 쓰고, 처음 쓸 때만 CDN에서 내려받는다. 이미지는 브라우저 밖으로 나가지 않는다.

import { findPanel, maskPixels } from "./image.js";
import { parseShot } from "./parse.js";

// 글자 인식 엔진과 한글 데이터. 버전을 고정해 둔다. (시험할 때는 window.OCR_PATHS 로 바꿔 끼울 수 있다)
const CDN = {
  script: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
  corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",
  langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/kor@1.0.0/4.0.0_best_int",
};
const paths = () => Object.assign({}, CDN, globalThis.OCR_PATHS);

let worker = null;

function loadEngine() {
  if (globalThis.Tesseract) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = paths().script;
    s.onload = () => resolve(); s.onerror = () => reject(new Error("load"));
    document.head.appendChild(s);
  });
}

/** 원본의 일부를 scale배로 키워 글자 색만 남긴 캔버스 */
function maskedCanvas(source, sx, sy, sw, sh, scale, kind) {
  const c = document.createElement("canvas");
  c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const pixels = g.getImageData(0, 0, c.width, c.height);
  maskPixels(pixels.data, kind);
  g.putImageData(pixels, 0, 0);
  return c;
}

/**
 * img: 화면에 올린 Image. onStatus: 진행 상황 문구를 받는 함수.
 * 반환: parseShot() 결과에 panel(상세 스탯 창을 찾았는지)을 붙인 것
 */
export async function recognizeShot(img, onStatus) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const full = document.createElement("canvas"); full.width = w; full.height = h;
  const ctx = full.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  // 1) 상세 스탯 창만 잘라낸다. 위쪽은 공격력 범위 툴팁이 들어오도록 넉넉하게
  const box = findPanel(ctx.getImageData(0, 0, w, h).data, w, h);
  let sx = 0, sy = 0, ex = w, ey = h;
  if (box) {
    const pw = box.x1 - box.x0, ph = box.y1 - box.y0;
    sx = Math.max(0, box.x0 - pw * 0.06); sy = Math.max(0, box.y0 - ph * 0.30);
    ex = Math.min(w, box.x1 + pw * 0.12); ey = Math.min(h, box.y1 + ph * 0.03);
  }
  const scale = Math.min(box ? 4 : 2, Math.max(1, 1640 / (ex - sx)));   // 글자가 작으면 키워서 읽는다

  // 2) 엔진 준비
  onStatus("글자 인식 엔진을 불러오는 중… (처음 한 번만 몇 초 걸려요)");
  await loadEngine();
  if (!worker) {
    const p = paths();
    const options = { logger: m => { if (m.status === "recognizing text") onStatus(`글자를 읽는 중… ${Math.round(m.progress * 100)}%`); } };
    for (const k of ["workerPath", "corePath", "langPath"]) if (p[k]) options[k] = p[k];
    worker = await globalThis.Tesseract.createWorker("kor", 1, options);
  }

  // 3) 두 번 읽는다: 하늘색 수치는 숫자만 허용해서 정확하게, 흰 라벨은 한글로
  const words = r => r.data.words.map(x => ({ text: x.text, conf: x.confidence, x0: x.bbox.x0, y0: x.bbox.y0, x1: x.bbox.x1, y1: x.bbox.y1 }));
  await worker.setParameters({ tessedit_pageseg_mode: "6", tessedit_char_whitelist: "0123456789.%" });
  const numbers = await worker.recognize(maskedCanvas(full, sx, sy, ex - sx, ey - sy, scale, "num"));
  await worker.setParameters({ tessedit_pageseg_mode: "6", tessedit_char_whitelist: "" });
  const labels = await worker.recognize(maskedCanvas(full, sx, sy, ex - sx, ey - sy, scale, "lab"));

  return Object.assign(parseShot(words(numbers), words(labels), labels.data.lines.map(l => l.text)), { panel: !!box });
}
