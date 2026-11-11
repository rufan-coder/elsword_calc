// 화면 코드에서 같이 쓰는 작은 도구들.

export const $ = id => document.getElementById(id);

/** 입력칸의 숫자. 비었거나 숫자가 아니면 null */
export const num = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : null; };
/** % 입력칸을 비율로 (83 -> 0.83). 비었으면 null */
export const pct = id => { const v = num(id); return v == null ? null : v / 100; };
/** % 입력칸을 비율로. 비었거나 음수면 0 */
export const pctOrZero = id => Math.max(0, pct(id) || 0);

/** 0.8345 -> "83.45%" */
export const fmt = (x, digits = 2) => (x * 100).toFixed(digits) + "%";
/** 0.05 -> "5%", 0.0106 -> "1.06%" (뒤의 0은 뗀다) */
export const trimPct = x => (x * 100).toFixed(2).replace(/\.?0+$/, "") + "%";
/** 0.0057 -> "+0.57%", 음수는 "−" */
export const signed = (x, digits = 2) => (x >= 0 ? "+" : "−") + (Math.abs(x) * 100).toFixed(digits) + "%";

/** 표의 "현재 → 최적" 두 칸. 값이 같으면 한 칸으로 합쳐 "그대로"라고 쓴다 */
export const arrowCells = (a, b, digits = 2) => Math.abs(a - b) < 5e-5
  ? `<td class="num muted" colspan="2">${fmt(a, digits)} 그대로</td>`
  : `<td class="num">${fmt(a, digits)}</td><td class="num up">→ ${fmt(b, digits)}</td>`;

export function esc(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

/** 받침에 따라 조사를 고른다: josa("지트마", "이", "가") -> "가" */
export function josa(word, withBatchim, without) {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xAC00 || ch > 0xD7A3) return withBatchim + "(" + without + ")";
  return (ch - 0xAC00) % 28 ? withBatchim : without;
}
