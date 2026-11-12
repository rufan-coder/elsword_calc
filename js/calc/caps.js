// 상한이 있는 스탯이 상한을 얼마나 넘었는지 (넘은 만큼은 DPS에 도움이 안 된다).

import { ADAPT_CAP, CDR_CAP } from "../data/rules.js";
import { POLAR_CAP, has, resolve, prod, sum } from "./stats.js";

/** 상한 설명 (화면의 툴팁) */
export const CAP_NOTES = {
  adapt: "적응력은 마을 버프와 합쳐 60%까지만 적용돼요.",
  cdr_gang: "강렬한 스킬 재사용 시간 감소는 35%까지만 적용돼요.",
  cdr_cho: "초월한 스킬 재사용 시간 감소는 35%까지만 적용돼요.",
  polar: "양극화는 60%까지만 적용돼요.",
  crit: "버프·패시브까지 더한 실전 크리티컬이 100%를 넘은 만큼이에요 (격려 제외).",
  maxi: "버프·패시브까지 더한 실전 극대화가 100%를 넘은 만큼이에요.",
};

/**
 * 스탯창 값(win)에서 상한을 넘은 양. 넘지 않은 스탯은 빠진다.
 *   adapt            적응력 + 마을 버프 - 60%
 *   cdr_gang, cdr_cho 35% 를 넘은 양
 *   polar            60% 를 넘은 양
 *   crit, maxi       실전 값(버프·패시브·크리저항 반영, 격려 제외)이 100% 를 넘은 양. job 이 있을 때만
 */
export function capOver(win, setup, job, resist) {
  const out = {}, put = (k, v) => { if (v > 5e-5) out[k] = v; };
  if (has(win, "adapt")) put("adapt", win.adapt + ((setup && setup.town_adapt) || 0) - ADAPT_CAP);
  for (const k of ["cdr_gang", "cdr_cho"]) if (has(win, k)) put(k, win[k] - CDR_CAP);
  if (has(win, "polar")) put("polar", win.polar - POLAR_CAP);
  if (job && setup) {
    const s = resolve(win, job, resist || 0, setup);
    if (has(s, "crit")) put("crit", s.crit * prod(s.crit_mults || []) + sum(s.crit_adds || []) - 1);
    if (has(s, "maxi")) put("maxi", s.maxi * prod(s.maxi_mults || []) + sum(s.maxi_adds || []) - 1);
  }
  return out;
}
