// 버프 세팅(마을 버프, 장비 강화, 각인석, 격려)을 계산에 쓰는 수치로 바꾼다.

import { TOWN_BUFFS, ENHANCE_BASE_PERCENT, YELLOW_ARTIFACT, PARTY_CRIT_DAMAGE, GUILD_BOSS_DAMAGE, ENCOURAGE, ENGRAVE_UPTIME } from "../data/buffs.js";
import { sum } from "./stats.js";

/**
 * 격려 가동률. 비전의 원석 수치(stoneCdr, stoneDur)는 성장 수치와 합연산된다.
 * 반환: { cool: 재사용 시간(초), dur: 지속 시간(초), uptime: 켜져 있는 비율 }
 */
export function encourage(stoneCdr, stoneDur) {
  const cool = ENCOURAGE.baseCooldown * Math.max(0.01, 1 - (ENCOURAGE.growthCooldownCut + stoneCdr));
  const dur = ENCOURAGE.baseDuration * (1 + ENCOURAGE.growthDurationUp + stoneDur);
  return { cool, dur, uptime: Math.min(1, dur / cool) };
}

/**
 * 금빛 각인석 세 줄을 옵션별 평균 효과로 바꾼다. rows: [{ kind, value }]
 * 수치에 가동률을 곱하고, 같은 옵션이 여러 줄이면 평균을 낸다.
 * kind: patk(물공) | matk(마공) | skill(스킬 데미지) | cd(크리티컬 데미지) | boss(보스 데미지) | none
 */
export function engrave(rows) {
  const out = {};
  for (const kind of ["patk", "matk", "skill", "cd", "boss"]) {
    const xs = rows.filter(r => r.kind === kind).map(r => (r.value || 0) * ENGRAVE_UPTIME);
    out[kind] = xs.length ? sum(xs) / xs.length : 0;
  }
  return out;
}

/**
 * 화면에서 고른 버프 세팅을 resolve()가 받는 setup으로 만든다.
 * choice: { town, pantsEnhance, shoesEnhance, yellow, engraveRows, stoneCdr, stoneDur }
 * 반환: { setup, detail } - detail은 화면에 "적용 값"으로 보여 주기 위한 중간 수치
 */
export function buildSetup(choice) {
  const town = TOWN_BUFFS[choice.town] || { crit: 0, maxi: 0 };
  const yellow = choice.yellow ? YELLOW_ARTIFACT : 0;
  const pants = (ENHANCE_BASE_PERCENT + (choice.pantsEnhance || 0)) / 100;
  const shoes = (ENHANCE_BASE_PERCENT + (choice.shoesEnhance || 0)) / 100;
  const eng = engrave(choice.engraveRows || []);
  const enc = encourage(choice.stoneCdr || 0, choice.stoneDur || 0);
  const setup = {
    town_crit: town.crit, town_maxi: town.maxi,
    crit_mults: [pants, yellow], maxi_mults: [shoes, yellow],
    cd_base_mults: [PARTY_CRIT_DAMAGE, eng.cd],
    guild_boss: GUILD_BOSS_DAMAGE + eng.boss,
    enc_uptime: enc.uptime,
  };
  return { setup, detail: { town, pants, shoes, yellow, eng, enc } };
}
