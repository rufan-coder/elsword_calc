// 스탯창 값 -> 실전 수치 -> DPS 지수.
//
// 여기서 쓰는 값의 모양
//   win   : 스탯창에 보이는 값. 확률·증가량은 비율(0.83 = 83%), 공격력은 그대로.
//           { crit, crit_dmg, maxi, A, A_max, W, boss, all_skill, cho, gang, share_cho, share_gang, polar, add, hp_over, hp_under, hp100,
//             adapt, super_adapt, cdr_gang, cdr_cho }
//   job   : 전직 패시브 (js/data/classes.js 의 한 항목). 없으면 NO_PASSIVE
//   setup : 스탯창에 안 보이는 버프 묶음 (js/calc/buffs.js 의 buildSetup 결과)
//           { town_crit, town_maxi, town_adapt, town_boss, crit_mults[], maxi_mults[], cd_base_mults[], guild_boss, enc_uptime,
//             debuff }   debuff 는 던전의 마계 디버프 (화면에서 고른 던전 값을 넣는다)

import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "./diminish.js";
import { ENCOURAGE } from "../data/buffs.js";
import { ADAPT_CAP, CDR_CAP, CDR_DPS_K } from "../data/rules.js";

export const prod = xs => xs.reduce((a, x) => a * (1 + x), 1);   // Π(1 + x)
export const sum = xs => xs.reduce((a, x) => a + x, 0);
const clamp01 = x => Math.min(1, Math.max(0, x));

/** 양극화는 60%까지만 적용된다 */
export const POLAR_CAP = 0.60;

/** 패시브가 없는 전직 (전직을 고르지 않았을 때) */
export const NO_PASSIVE = { crit_s: 0, crit_m: 0, crit_a: 0, cd_s: 0, cd_final: 0, cd_base: 0, maxi_s: 0, maxi_m: 0, maxi_a: 0, boss: 0, hp_over: 0, hp_under: 0, gang: 0, cho: 0 };

export const has = (s, k) => typeof s[k] === "number" && isFinite(s[k]);
export const hasCrit = s => has(s, "crit") && has(s, "crit_dmg");
export const hasMaxi = s => has(s, "maxi") && has(s, "A") && has(s, "A_max") && s.A > 0;
export const hasAtkPct = s => has(s, "A") && has(s, "A_max") && has(s, "W") && s.W > 0 && s.A > 0;

/** 격려(크확 곱연산)가 가동률만큼만 켜져 있을 때의 평균 크리티컬 확률. base = 곱연산까지 끝난 확률, adds = 최종 합연산 */
function critWithEncourage(base, adds, uptime) {
  const off = base + sum(adds), bonus = base * ENCOURAGE.critMult;
  if (off + bonus <= 1) return Math.max(0, off + bonus * uptime);
  return 1 - (1 - clamp01(off)) * (1 - uptime);   // 격려 중에는 100%를 넘으므로 그 구간은 100%로 계산
}

/** 실전 평균 크리티컬 확률 */
export function critFinal(s) {
  const base = s.crit * prod(s.crit_mults || []), adds = s.crit_adds || [];
  return clamp01(s.enc_uptime ? critWithEncourage(base, adds, s.enc_uptime) : base + sum(adds));
}

/** 실전 극대화 */
export function maxiFinal(s) {
  return Math.min(1, s.maxi * prod(s.maxi_mults || []) + sum(s.maxi_adds || []));
}

/**
 * 극대화로 평균 공격력이 늘어나는 배율.
 * 원래 식은 1 + 0.55·M·W·(1+Ps)/A 이고 Ps = 2(Amax-A)/(1.1W) - 1 이라, 무기 공격력 W가 약분돼 1 + M·(Amax-A)/A 가 된다.
 */
export function maxiMult(M, A, Amax) {
  return 1 + M * Math.max(0, Amax - A) / A;
}

/** 스텟형 물리/마법 공격력 % = 극대화 구간 길이 2(Amax-A) ÷ 무기 구간 길이 1.1W - 1 */
export function statAtkPct(A, Amax, W) {
  return 2 * (Amax - A) / (1.1 * W) - 1;
}

/**
 * 게임에서 보이는 강렬:초월 딜 비중을 스킬 데미지 증가가 적용되기 전의 비중으로 되돌린다.
 * 반환값은 [강렬 비중, 초월 비중].
 */
export function preShares(shareGang, shareCho, gang, cho) {
  const g = shareGang / (1 + gang), c = shareCho / (1 + cho);
  return g + c > 0 ? [g / (g + c), c / (g + c)] : [0, 1];
}

/** 최종 적응력 = min(적응력 + 마을 버프, 60%) + 초적응력 */
export function adaptFinal(s) {
  return Math.min((s.adapt || 0) + (s.adapt_add || 0), ADAPT_CAP) + (s.super_adapt || 0);
}

/** 마계 디버프 중 적응력으로 못 막은 만큼 데미지가 줄어든다: 1 - max(0, 디버프 - 최종 적응력) */
export function adaptMult(s) {
  return 1 - Math.max(0, (s.debuff || 0) - adaptFinal(s));
}

/**
 * 스킬 재사용 시간 감소로 늘어나는 DPS 배율.
 * 강렬·초월 각각 상한 35%로 가동률 1/(1-쿨감)을 구해 딜 점유율로 평균 내고, 보정 상수만큼만 DPS에 반영한다.
 */
export function cdrMult(s) {
  const up = c => 1 / (1 - Math.min(Math.max(c || 0, 0), CDR_CAP));
  let wc = s.share_cho == null ? 1 : s.share_cho, wg = s.share_gang || 0;
  if (wc + wg <= 0) wc = 1;
  const uptime = (wc * up(s.cdr_cho) + wg * up(s.cdr_gang)) / (wc + wg);
  return 1 + CDR_DPS_K * (uptime - 1);
}

/** HP 50% 초과/이하 구간을 절반씩 싸운다고 보고 평균 낸 배율. extra는 전직 패시브의 구간별 최종 데미지 */
function hpMultiplier(over, under, extraOver, extraUnder) {
  return 0.5 * (1 + over) * prod(extraOver || []) + 0.5 * (1 + under) * prod(extraUnder || []);
}

/**
 * 스탯창 값에 버프·전직 패시브·던전 크리저항을 반영한 실전 수치를 만든다.
 * 크리티컬·극대화는 점감을 풀고 -> 스텟 합연산을 더하고 -> 다시 점감을 건 뒤, 곱연산·최종 합연산 항목을 따로 붙여 둔다.
 */
export function resolve(win, job, critResist, setup) {
  const c = job || NO_PASSIVE;
  const s = Object.assign({}, win);
  if (has(s, "crit")) {
    s.crit = critFromStat(statFromCrit(s.crit) + setup.town_crit + c.crit_s);
    s.crit_mults = setup.crit_mults.concat([c.crit_m]);
    s.crit_adds = [c.crit_a, -critResist];
    s.enc_uptime = setup.enc_uptime;
  }
  // 크뎀: 기본 크뎀 150%에 곱연산되는 항목은 150% x (곱 - 1) 만큼의 크뎀으로 환산해서 더한다
  if (has(s, "crit_dmg")) s.crit_dmg = (s.crit_dmg + c.cd_s + 1.5 * (prod(setup.cd_base_mults.concat([c.cd_base])) - 1)) * (1 + c.cd_final);
  if (has(s, "maxi")) {
    s.maxi = maxiFromStat(statFromMaxi(s.maxi) + setup.town_maxi + c.maxi_s);
    s.maxi_mults = setup.maxi_mults.concat([c.maxi_m]);
    s.maxi_adds = [c.maxi_a];
  }
  if (has(s, "boss")) s.boss = s.boss + setup.guild_boss + c.boss + (setup.town_boss || 0);
  if (has(s, "adapt")) { s.adapt_add = setup.town_adapt || 0; s.debuff = setup.debuff || 0; }
  for (const k of ["gang", "cho"]) if (has(s, k)) s[k] += c[k];
  s.hp3_over = [c.hp_over]; s.hp3_under = [c.hp_under];
  return s;
}

/**
 * DPS에 비례하는 지수. 절대값에는 의미가 없고, 옵션을 바꾸기 전후의 비율로만 쓴다.
 * 입력은 resolve()를 거친 실전 수치. 입력이 비어 있는 항목은 곱하지 않는다(= 비교에 영향 없음).
 */
export function dpsIndex(s) {
  let x = 1;
  for (const k of ["atk_pct", "all_skill", "boss", "add", "hp100"]) x *= 1 + (s[k] || 0);
  x *= 1 + Math.min(s.polar || 0, POLAR_CAP);
  if (has(s, "cho") || has(s, "gang")) {
    const g = s.gang || 0, c = s.cho || 0;
    // 딜 비중은 옵션을 올리기 전 수치(_base_*) 기준으로 고정해야 올린 뒤와 공정하게 비교된다
    const [Rg, Rc] = preShares(s.share_gang || 0, s.share_cho == null ? 1 : s.share_cho,
                               s._base_gang == null ? g : s._base_gang, s._base_cho == null ? c : s._base_cho);
    x *= Rc * (1 + c) + Rg * (1 + g);
  }
  if (hasCrit(s)) { const p = critFinal(s); x *= 1 - p + p * s.crit_dmg; }
  if (hasMaxi(s)) x *= maxiMult(maxiFinal(s), s.A, s.A_max);
  x *= hpMultiplier(s.hp_over || 0, s.hp_under || 0, s.hp3_over, s.hp3_under);
  if (has(s, "adapt")) x *= adaptMult(s);
  if (has(s, "cdr_gang") || has(s, "cdr_cho")) x *= cdrMult(s);
  return x;
}

/** 스탯창 크리티컬 확률이 critWindow 일 때의 크리티컬 배율 (평균 크확과 크뎀을 합친 것) */
export function critFactor(win, job, critResist, setup, critWindow) {
  const s = resolve({ crit: critWindow, crit_dmg: win.crit_dmg }, job, critResist, setup);
  const p = critFinal(s);
  return 1 - p + p * s.crit_dmg;
}

/** 스탯창 극대화가 maxiWindow 일 때의 극대화 배율 */
export function maxiFactor(win, job, critResist, setup, maxiWindow) {
  const s = resolve({ maxi: maxiWindow, A: win.A, A_max: win.A_max }, job, critResist, setup);
  return maxiMult(maxiFinal(s), s.A, s.A_max);
}
