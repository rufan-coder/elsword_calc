// 상한이 있는 스탯이 상한을 얼마나 넘었는지 (넘은 만큼은 DPS에 도움이 안 된다).

import { ADAPT_CAP, CDR_CAP } from "../data/rules.js";
import { POLAR_CAP, has, resolve, prod, sum } from "./stats.js";
import { statFromCrit, statFromMaxi } from "./diminish.js";

/** 점감이 100%에 닿는 점감 전 합 (크리 140%, 극대 160%) */
const CRIT_SAT = statFromCrit(1), MAXI_SAT = statFromMaxi(1);

/** 상한 설명 (화면의 툴팁) */
export const CAP_NOTES = {
  adapt: "적응력은 마을 버프와 합쳐 60%까지만 적용돼요.",
  cdr_gang: "강렬한 스킬 재사용 시간 감소는 35%까지만 적용돼요 (젬블리스는 24%).",
  cdr_cho: "초월한 스킬 재사용 시간 감소는 35%까지만 적용돼요 (젬블리스는 24%).",
  polar: "양극화는 60%까지만 적용돼요.",
  aspd: "동작 속도는 (1 + 스탯창 동속) × 곱연산 버프(최대 ×1.4)가 70%에서 멈춰요. 격려까지 켜졌을 때 천장에 닿고도 남는 스탯창 동속이에요.",
  crit: "버프·패시브까지 더한 실전 크리티컬이 100%를 넘은 만큼이에요 (격려 제외).",
  maxi: "버프·패시브까지 더한 실전 극대화가 100%를 넘은 만큼이에요.",
  crit_sat: "스탯창 크리 + 마을 버프 + 전직 스텟 합연이 점감 전 140%를 넘은 만큼이에요 (소켓 수치 기준). 점감이 이미 100%라서 이만큼은 크리에 들어가지 않아요. 스탯창이 100%면 실제로는 더 넘었을 수 있어요.",
  maxi_sat: "스탯창 극대 + 마을 버프 + 전직 스텟 합연이 점감 전 160%를 넘은 만큼이에요 (소켓 수치 기준). 점감이 이미 100%라서 이만큼은 극대화에 들어가지 않아요. 스탯창이 100%면 실제로는 더 넘었을 수 있어요.",
};

/**
 * 스탯창 값(win)에서 상한을 넘은 양. 넘지 않은 스탯은 빠진다.
 *   adapt            적응력 + 마을 버프 - 60%
 *   cdr_gang, cdr_cho 35%(젬블리스 24%, job.cdr_cap)를 넘은 양
 *   polar            60% 를 넘은 양
 *   crit, maxi       실전 값(버프·패시브·크리저항 반영, 격려 제외)이 100% 를 넘은 양. job 이 있을 때만
 *   crit_sat, maxi_sat 점감 전 합(스탯창 + 마을 버프 + 전직 스텟 합연)이 점감 포화점(크리 140%, 극대 160%)을 넘은 양.
 *                    스텟 합연 패시브가 큰 전직(+20%)은 스탯창 크리 90%, 극대 93.75%부터 넘는다. 크리저항 때문에 실전 값은
 *                    100% 아래여도 소켓이 버려질 수 있어서 따로 본다. job 이 있을 때만
 */
export function capOver(win, setup, job, resist) {
  const out = {}, put = (k, v) => { if (v > 5e-5) out[k] = v; };
  if (has(win, "adapt")) put("adapt", win.adapt + ((setup && setup.town_adapt) || 0) - ADAPT_CAP);
  const cdrCap = (job && job.cdr_cap != null) ? job.cdr_cap : CDR_CAP;
  for (const k of ["cdr_gang", "cdr_cho"]) if (has(win, k)) put(k, win[k] - cdrCap);
  if (has(win, "polar")) put("polar", win.polar - POLAR_CAP);
  if (job && setup) {
    if (has(win, "crit")) put("crit_sat", statFromCrit(win.crit) + (setup.town_crit || 0) + (job.crit_s || 0) - CRIT_SAT);
    if (has(win, "maxi")) put("maxi_sat", statFromMaxi(win.maxi) + (setup.town_maxi || 0) + (job.maxi_s || 0) - MAXI_SAT);
    const s = resolve(win, job, resist || 0, setup);
    if (has(s, "crit")) put("crit", s.crit * prod(s.crit_mults || []) + sum(s.crit_adds || []) - 1);
    if (has(s, "maxi")) put("maxi", s.maxi * prod(s.maxi_mults || []) + sum(s.maxi_adds || []) - 1);
  }
  return out;
}
