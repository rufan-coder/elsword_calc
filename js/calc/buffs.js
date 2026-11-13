// 버프 세팅(마을 버프, 장비 강화, 격려)을 계산에 쓰는 수치로 바꾼다.

import { TOWN_BUFFS, ENHANCE_BASE_PERCENT, YELLOW_ARTIFACT, PARTY_CRIT_DAMAGE, GUILD_BOSS_DAMAGE, ENCOURAGE } from "../data/buffs.js";

/**
 * 격려 가동률. 비전의 원석 수치(stoneCdr, stoneDur)는 성장 수치와 합연산된다.
 * 반환: { cool: 재사용 시간(초), dur: 지속 시간(초), uptime: 켜져 있는 비율 }
 */
export function encourage(stoneCdr, stoneDur) {
  const cool = ENCOURAGE.baseCooldown * Math.max(0.01, 1 - (ENCOURAGE.growthCooldownCut + stoneCdr));
  const dur = ENCOURAGE.baseDuration * (1 + ENCOURAGE.growthDurationUp + stoneDur);
  return { cool, dur, uptime: Math.min(1, dur / cool) };
}

/** setup 의 마을 버프 부분만 다른 버프로 바꾼 새 setup (악세 세팅에서 마을 버프를 바꿔 볼 때) */
export function setupWithTown(setup, name) {
  const t = TOWN_BUFFS[name] || { crit: 0, maxi: 0, adapt: 0, boss: 0 };
  return Object.assign({}, setup, { town_crit: t.crit, town_maxi: t.maxi, town_adapt: t.adapt || 0, town_boss: t.boss || 0, town_final: t.final || 0 });
}

/**
 * 화면에서 고른 버프 세팅을 resolve()가 받는 setup으로 만든다.
 * choice: { town, pantsEnhance, shoesEnhance, yellow, stoneCdr, stoneDur }
 * 반환: { setup, detail } - detail은 화면에 "적용 값"으로 보여 주기 위한 중간 수치
 */
export function buildSetup(choice) {
  const town = TOWN_BUFFS[choice.town] || { crit: 0, maxi: 0, adapt: 0, boss: 0 };
  const yellow = choice.yellow ? YELLOW_ARTIFACT : 0;
  const pants = (ENHANCE_BASE_PERCENT + (choice.pantsEnhance || 0)) / 100;
  const shoes = (ENHANCE_BASE_PERCENT + (choice.shoesEnhance || 0)) / 100;
  const enc = encourage(choice.stoneCdr || 0, choice.stoneDur || 0);
  const setup = {
    town_crit: town.crit, town_maxi: town.maxi, town_adapt: town.adapt || 0, town_boss: town.boss || 0, town_final: town.final || 0,
    crit_mults: [pants, yellow], maxi_mults: [shoes, yellow],
    cd_base_mults: [PARTY_CRIT_DAMAGE],
    guild_boss: GUILD_BOSS_DAMAGE,
    enc_uptime: enc.uptime,
  };
  return { setup, detail: { town, pants, shoes, yellow, enc } };
}
