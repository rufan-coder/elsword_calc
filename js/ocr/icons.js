// 아이템 아이콘을 비교할 수 있는 숫자(특징값)로 바꾸고, 기준표와 맞춘다. 브라우저 없이도 돌아가는 순수 함수만 둔다.
//
// 아이콘의 배경색은 캐릭터마다 다르다 (라비는 분홍, 일반 악세는 연두 등). 그래서
//   1) 아이콘 가장자리에서 배경색(색상·채도·밝기 범위)을 알아내고, 그 범위의 픽셀은 지운다
//   2) 별 표시·옷걸이 태그·자물쇠처럼 아이템과 상관없이 덧그려지는 자리도 지운다
//   3) 남은 그림을 8x8로 줄여 색(3) + 그림이 있는 비율(1) = 256개 숫자로 만든다
// 같은 아이템이면 배경색이 달라도 비슷한 숫자가 나온다.

/** 배경을 지우지 않고 비교하는 묶음 (배경색이 캐릭터마다 다르지 않은 것) */
export const KEEP_BACKGROUND = new Set(["normal"]);

const N = 32;      // 먼저 이 크기로 맞춘다
const G = 8;       // 특징값 격자
export const FEATURE_LENGTH = G * G * 4;

/** 덧그림 자리: 오른쪽 별 칸, 오른쪽 아래 옷걸이 태그, 왼쪽 위 자물쇠·체크 표시 */
const OVERLAY = (() => {
  const m = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (x >= N * 0.70 || (y >= N * 0.62 && x >= N * 0.55) || (x < N * 0.32 && y < N * 0.32)) m[y * N + x] = 1;
  }
  return m;
})();

/** RGBA 이미지의 (box) 영역을 N x N 으로 줄인다 (넓이 평균). 반환은 0~1 RGB */
function resample(data, width, box) {
  const out = new Float32Array(N * N * 3), sx = box.w / N, sy = box.h / N;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x0 = box.x + i * sx, x1 = x0 + sx, y0 = box.y + j * sy, y1 = y0 + sy;
    let r = 0, g = 0, b = 0, wsum = 0;
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      const wy = Math.min(y + 1, y1) - Math.max(y, y0);
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        const w = (Math.min(x + 1, x1) - Math.max(x, x0)) * wy, p = (y * width + x) * 4;
        r += data[p] * w; g += data[p + 1] * w; b += data[p + 2] * w; wsum += w;
      }
    }
    const q = (j * N + i) * 3;
    out[q] = r / wsum / 255; out[q + 1] = g / wsum / 255; out[q + 2] = b / wsum / 255;
  }
  return out;
}

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-9) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, mx > 0 ? d / mx : 0, mx];
}
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

const pct = (xs, q) => { const a = xs.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };

/**
 * 배경색 범위. 가장자리 픽셀에서 가장 흔한 색상(10도 단위)을 찾고, 그 색상 픽셀들의 채도·밝기 범위를 잰다.
 * 분홍처럼 진한 배경도, 연두처럼 옅은 배경도 같은 방법으로 잡힌다. 색이 거의 없으면 null
 */
function backgroundRange(px) {
  const ring = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!(x < 2 || y < 2 || x >= N - 2 || y >= N - 2) || OVERLAY[y * N + x]) continue;
    const q = (y * N + x) * 3, c = hsv(px[q], px[q + 1], px[q + 2]);
    if (c[1] > 0.08) ring.push(c);
  }
  if (ring.length < 12) return null;
  const bins = new Float32Array(36);
  for (const [h] of ring) bins[Math.floor(h / 10) % 36]++;
  let best = 0;
  for (let i = 1; i < 36; i++) if (bins[i] + bins[(i + 35) % 36] * 0.5 + bins[(i + 1) % 36] * 0.5 > bins[best] + bins[(best + 35) % 36] * 0.5 + bins[(best + 1) % 36] * 0.5) best = i;
  const center = best * 10 + 5, near = ring.filter(([h]) => hueGap(h, center) <= 20);
  if (near.length < 10) return null;
  // 원 위의 평균 (350도와 10도의 평균이 0도가 되게)
  const sx = near.reduce((a, [h]) => a + Math.cos(h * Math.PI / 180), 0), sy = near.reduce((a, [h]) => a + Math.sin(h * Math.PI / 180), 0);
  const s = near.map(c => c[1]), v = near.map(c => c[2]);
  const h = (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360;
  // 진한 배경(분홍 등)은 색상만 보고 지우는 게 아이콘을 덜 지운다. 옅은 배경(연두 등)은 채도·밝기 범위까지 본다
  if (pct(s, 0.5) > 0.35) return { h, s0: 0.25, s1: 1, v0: 0, v1: 1 };
  return { h, s0: pct(s, 0.1) - 0.06, s1: pct(s, 0.9) + 0.06, v0: pct(v, 0.1) - 0.1, v1: pct(v, 0.9) + 0.1 };
}

/**
 * 아이콘 특징값.
 * data, width : RGBA 픽셀 (canvas 의 ImageData.data 와 같은 모양)
 * box         : 아이콘 영역 { x, y, w, h } (칸 테두리는 빼고)
 * keepBackground : 배경을 지우지 않는다. 일반 악세는 캐릭터와 상관없이 배경이 같은 연두색이라 지우지 않는 편이 더 잘 구분된다
 * 반환: Uint8Array(256)
 */
export function iconFeature(data, width, box, { keepBackground = false } = {}) {
  const px = resample(data, width, box), bg = keepBackground ? null : backgroundRange(px);
  const keep = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) {
    if (OVERLAY[k]) continue;
    const [h, s, v] = hsv(px[k * 3], px[k * 3 + 1], px[k * 3 + 2]);
    const isBg = bg && s > 0.08 && hueGap(h, bg.h) < 25 && s >= bg.s0 && s <= bg.s1 && v >= bg.v0 && v <= bg.v1;
    keep[k] = isBg ? 0 : 1;
  }
  const f = new Uint8Array(FEATURE_LENGTH), c = N / G;
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    let r = 0, g = 0, b = 0, k = 0;
    for (let y = gy * c; y < (gy + 1) * c; y++) for (let x = gx * c; x < (gx + 1) * c; x++) {
      const i = y * N + x;
      if (keep[i]) { r += px[i * 3]; g += px[i * 3 + 1]; b += px[i * 3 + 2]; k++; }
    }
    const o = (gy * G + gx) * 4, area = c * c;
    f[o] = Math.round(r / area * 255); f[o + 1] = Math.round(g / area * 255); f[o + 2] = Math.round(b / area * 255); f[o + 3] = Math.round(k / area * 255);
  }
  return f;
}

/** 빈 칸(어두운 회색에 흐린 윤곽만 있는 칸)인지 */
export function isEmptySlot(data, width, box) {
  const px = resample(data, width, box);
  let v = 0, s = 0;
  for (let k = 0; k < N * N; k++) { const [, ss, vv] = hsv(px[k * 3], px[k * 3 + 1], px[k * 3 + 2]); v += vv; s += ss; }
  return v / (N * N) < 0.32 && s / (N * N) < 0.18;
}

export function featureDistance(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) { const t = (a[i] - b[i]) / 255; d += t * t; }
  return Math.sqrt(d);
}

// 기준표에는 특징값을 base64 글자로 넣어 둔다
export function encodeFeature(f) {
  let s = "";
  for (const v of f) s += String.fromCharCode(v);
  return typeof btoa === "function" ? btoa(s) : Buffer.from(f).toString("base64");
}
export function decodeFeature(text) {
  if (typeof atob === "function") { const s = atob(text), f = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) f[i] = s.charCodeAt(i); return f; }
  return new Uint8Array(Buffer.from(text, "base64"));
}

/** 이 거리보다 멀면 기준표에 없는 아이템으로 본다 */
export const MAX_DISTANCE = 2.2;
/** 1등이 2등보다 이 배수 이상 가까워야 확신한다 */
export const MIN_RATIO = 1.5;

/**
 * 기준표 후보 중 가장 닮은 아이템.
 * refs : [{ id, f }]  (같은 id 가 여러 개여도 된다)
 * same : (id1, id2) => 계산상 같은 것으로 봐도 되는지 (예: 같은 세트의 헤어 두 종류)
 * 반환: { id, distance, ratio, sure } 또는 null (후보가 없음)
 */
export function matchIcon(f, refs, same = (a, b) => a === b) {
  const best = new Map();
  for (const r of refs) {
    const d = featureDistance(f, r.f);
    if (!best.has(r.id) || d < best.get(r.id)) best.set(r.id, d);
  }
  const list = [...best].map(([id, d]) => ({ id, d })).sort((a, b) => a.d - b.d);
  if (!list.length) return null;
  const first = list[0], rival = list.find(x => !same(x.id, first.id));
  const ratio = rival ? rival.d / Math.max(first.d, 1e-6) : Infinity;
  return { id: first.id, distance: first.d, ratio, sure: first.d <= MAX_DISTANCE && ratio >= MIN_RATIO };
}

/**
 * 스크린샷의 칸 하나를 기준표와 맞춘다.
 * 창 위치를 1~2픽셀 잘못 잡으면 칸 테두리가 섞여 들어가 결과가 크게 흔들리므로,
 * 칸 위치를 위아래·좌우로 조금씩 옮겨 보며 가장 잘 맞는 자리의 결과를 쓴다.
 * opts: { keepBackground, same, shift (옮겨 볼 최대 픽셀) }
 */
export function matchCell(data, width, box, refs, { keepBackground = false, same, shift = 3 } = {}) {
  let best = null;
  const step = Math.max(1, Math.round(box.w / 34));
  for (let dy = -shift; dy <= shift; dy += step) for (let dx = -shift; dx <= shift; dx += step) {
    const f = iconFeature(data, width, { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h }, { keepBackground });
    const m = matchIcon(f, refs, same);
    if (m && (!best || m.distance < best.distance)) best = Object.assign(m, { feature: f });
  }
  return best;
}
