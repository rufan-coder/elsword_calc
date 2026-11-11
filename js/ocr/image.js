// 스크린샷 픽셀 다루기: 상세 스탯 창 위치 찾기, 글자 색만 남기기.
// 픽셀 배열(RGBA)만 받으므로 브라우저 없이도 시험할 수 있다.

// 상세 스탯 창의 줄 배경색. 살짝 푸른 회색이라 다른 회색 창과 구분된다.
const ROW_BG = [36, 42, 48];

/** 기준(최댓값의 30%)을 넘는 칸이 이어진 구간 중 합이 가장 큰 것. maxGap 이하의 틈은 이어 붙인다 */
function bestRun(hist, maxGap) {
  let peak = 0;
  for (const v of hist) if (v > peak) peak = v;
  const threshold = peak * 0.3;
  let best = null, start = -1, last = -1, total = 0;
  const close = () => { if (start >= 0 && (!best || total > best.total)) best = { a: start, b: last, total }; };
  for (let i = 0; i < hist.length; i++) {
    if (hist[i] <= threshold) continue;
    if (start < 0 || i - last > maxGap) { close(); start = i; total = 0; }
    total += hist[i]; last = i;
  }
  close();
  return best && Object.assign(best, { peak });
}

/**
 * 줄 배경색이 모여 있는 사각형 = 상세 스탯 창.
 * data: RGBA 픽셀 배열, w x h 크기. 못 찾으면 null
 */
export function findPanel(data, w, h) {
  const isBg = new Uint8Array(w * h), cols = new Uint32Array(w);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.abs(r - ROW_BG[0]) <= 6 && Math.abs(g - ROW_BG[1]) <= 6 && Math.abs(b - ROW_BG[2]) <= 6 && b - r >= 6) { isBg[p] = 1; cols[p % w]++; }
  }
  const x = bestRun(cols, 12);
  if (!x || x.peak < 100 || x.b - x.a < 150) return null;
  const rows = new Uint32Array(h);
  for (let y = 0; y < h; y++) { let n = 0; for (let px = x.a; px <= x.b; px++) n += isBg[y * w + px]; rows[y] = n; }
  const y = bestRun(rows, Math.max(40, Math.round((x.b - x.a) * 0.1)));   // 구역 제목 띠만큼의 틈은 이어 붙임
  if (!y || y.b - y.a < 80) return null;
  return { x0: x.a, y0: y.a, x1: x.b, y1: y.b };
}

/**
 * 글자 색만 검은색으로 남긴 흑백 이미지로 바꾼다 (제자리에서 수정).
 *   kind "num" : 하늘색 수치. 모양은 밝기로 잡고(JPEG에서도 선명), 색은 하늘색인지만 느슨하게 확인
 *   kind "lab" : 흰색 라벨
 */
export function maskPixels(data, kind) {
  const c01 = x => Math.min(1, Math.max(0, x));
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const ink = kind === "num"
      ? c01((0.299 * r + 0.587 * g + 0.114 * b - 55) / 60) * c01((Math.min(g, b) - r - 22) / 18)
      : c01((Math.min(r, g, b) - 70) / 110);
    data[i] = data[i + 1] = data[i + 2] = 255 - 255 * ink;
    data[i + 3] = 255;
  }
}
