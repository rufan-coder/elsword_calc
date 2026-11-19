// 동작 속도: DPS에는 넣지 않고, 버프까지 반영한 실전 동작 속도와 천장(70%)까지 필요한 스탯창 값만 구한다.
// 식과 수치는 js/data/buffs.js 의 ASPD 참고.

import { ASPD, BUFF_ITEMS } from "../data/buffs.js";
import { prod } from "./stats.js";

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
 * win  : 스탯창 동작 속도 (점감 합연, 0.214 = 21.4%)
 * mults: 상시 곱연산 버프 값 목록, enc: 격려 곱연산 (켜져 있을 때)
 * 반환: { normal, enc, multNormal, multEnc, need, needNormal, over }
 *   normal, enc : 평소·격려 중 실전 동속 (0.70 = 70%)
 *   need        : 격려 중 천장(70%)에 닿는 스탯창 동속. 30%로도 못 닿으면 null
 *   needNormal  : 평소 천장에 닿는 스탯창 동속 (못 닿으면 null)
 *   over        : 스탯창 동속이 need 를 넘은 양 (격려 중에도 천장이라 더 안 오르는 몫). 없으면 0
 */
export function aspdCalc(win, mults, enc = ASPD.encourage) {
  const stat = 1 + Math.max(0, Math.min(win || 0, ASPD.window_cap));
  const cap = m => Math.min(m, 1 + ASPD.mult_cap);
  const multNormal = cap(prod(mults)), multEnc = cap(prod(mults.concat([enc])));
  const final = m => Math.min(stat * m, 1 + ASPD.final_cap) - 1;
  const needFor = m => { const x = (1 + ASPD.final_cap) / m - 1; return x <= ASPD.window_cap + 1e-12 ? Math.max(0, x) : null; };
  const need = needFor(multEnc);
  return { normal: final(multNormal), enc: final(multEnc), multNormal, multEnc, need, needNormal: needFor(multNormal), over: need == null ? 0 : Math.max(0, (win || 0) - need) };
}
