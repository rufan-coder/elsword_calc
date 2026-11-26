// 동작 속도: DPS에는 넣지 않고, 버프까지 반영한 실전 동작 속도와 천장(70%)까지 필요한 스탯창 값만 구한다.
// 식과 수치는 js/data/buffs.js 의 ASPD 참고.

import { ASPD, BUFF_ITEMS } from "../data/buffs.js";
import { ASPD_SKILLS } from "../data/aspd.js";
import { prod } from "./stats.js";

/** 점감 전 동속 -> 점감 후 (스탯창에 보이는 값). ASPD.dim 구간을 잇는다. 30%에서 멈춘다 */
export function aspdDim(raw) {
  const t = ASPD.dim;
  if (raw <= 0) return 0;
  for (let i = 1; i < t.length; i++) if (raw <= t[i][0]) return t[i - 1][1] + (raw - t[i - 1][0]) * (t[i][1] - t[i - 1][1]) / (t[i][0] - t[i - 1][0]);
  return t[t.length - 1][1];
}
/** 점감 후(스탯창) -> 점감 전. 30% 이상이면 30%가 되는 가장 작은 점감 전 값 */
export function aspdRaw(shown) {
  const t = ASPD.dim;
  if (shown <= 0) return 0;
  for (let i = 1; i < t.length; i++) if (shown <= t[i][1]) return t[i - 1][0] + (shown - t[i - 1][1]) * (t[i][0] - t[i - 1][0]) / (t[i][1] - t[i - 1][1]);
  return t[t.length - 1][0];
}

/**
 * 고른 전직의 동속 패시브·버프 [{ key, name, v, kind, dur, note, toggle, on, guess }].
 * overrides: { "전직|스킬 이름": true/false } 켜고 끈 것 (없으면 처음 값)
 */
export function classAspd(cls, overrides = {}) {
  return ASPD_SKILLS.filter(s => s.classes.includes(cls)).map(s => {
    const key = `${cls}|${s.name}`;
    const first = !s.toggle || (Array.isArray(s.defaultOn) ? s.defaultOn.includes(cls) : !!s.defaultOn);
    const on = s.toggle && overrides && key in overrides ? !!overrides[key] : first;
    return { key, name: s.name, v: s.v, kind: s.kind, dur: s.dur, note: s.note || "", toggle: !!s.toggle, on, guess: !!s.guess };
  });
}

/**
 * 곱연산 동속 버프 목록 [{ name, v }] (격려 제외).
 * faceTop: 얼굴 상단 일반 악세 이름, party: 파티 기준이면 true
 */
export function aspdBuffs(faceTop, party) {
  const out = [{ name: "각성 칭호", v: ASPD.title }];
  const halo = faceTop && (BUFF_ITEMS.face_top[faceTop] || {}).aspd_mult;
  if (halo) out.push({ name: faceTop, v: halo });
  if (party) out.push({ name: "파티", v: ASPD.party });
  return out;
}

/**
 * 실전 동작 속도.
 * win  : 스탯창 동작 속도 (점감 후, 0.214 = 21.4%)
 * mults: 곱연산 버프 값 목록, enc: 격려 곱연산 (켜져 있을 때)
 * dims : 전직 점감 합연 패시브·버프 값 목록 (점감 전 값에 더한다), flats: 무점감 값 목록 (천장 뒤에 더한다)
 * 반환: { normal, enc, multNormal, multEnc, stat, flat, need, needNormal, over }
 *   normal, enc : 평소·격려 중 실전 동속 (0.70 = 70%, 무점감이 있으면 그만큼 더 높다)
 *   stat        : 점감 합연 몫 (스탯창 + 점감 합연 패시브, 점감 후, 30%까지)
 *   need        : 격려 중 천장(70%)에 닿는 스탯창 동속. 30%로도 못 닿으면 null
 *   needNormal  : 평소 천장에 닿는 스탯창 동속 (못 닿으면 null)
 *   over        : 스탯창 동속이 need 를 넘은 양 (격려 중에도 천장이라 더 안 오르는 몫). 없으면 0
 */
export function aspdCalc(win, mults, enc = ASPD.encourage, dims = [], flats = []) {
  const extra = dims.reduce((a, x) => a + x, 0), flat = flats.reduce((a, x) => a + x, 0);
  const shown = Math.max(0, Math.min(win || 0, ASPD.window_cap));
  const statPart = extra ? aspdDim(aspdRaw(shown) + extra) : shown;
  const stat = 1 + statPart;
  const cap = m => Math.min(m, 1 + ASPD.mult_cap);
  const multNormal = cap(prod(mults)), multEnc = cap(prod(mults.concat([enc])));
  const final = m => Math.min(stat * m, 1 + ASPD.final_cap) - 1 + flat;
  // 천장에 닿는 점감 합연 몫 x -> 그때의 스탯창 값 (패시브 몫을 빼고 다시 점감)
  const needFor = m => {
    const x = (1 + ASPD.final_cap) / m - 1;
    if (x > ASPD.window_cap + 1e-12) return null;
    if (!extra) return Math.max(0, x);
    const raw = aspdRaw(Math.max(0, x)) - extra;
    return raw <= 0 ? 0 : aspdDim(raw);
  };
  const need = needFor(multEnc);
  return { normal: final(multNormal), enc: final(multEnc), multNormal, multEnc, stat: statPart, flat, need, needNormal: needFor(multNormal), over: need == null ? 0 : Math.max(0, (win || 0) - need) };
}
