// 버프 세팅(마을 버프, 장비 강화, 격려)을 계산에 쓰는 수치로 바꾼다.

import { TOWN_BUFFS, ENHANCE_BASE_PERCENT, YELLOW_ARTIFACT, PARTY_CRIT_DAMAGE, GUILD_BOSS_DAMAGE, ENCOURAGE, BUFF_ITEMS } from "../data/buffs.js";

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
 * 버프형 아이템(얼굴 상단·귀걸이 일반 악세)의 크뎀 곱연산: [{ name, slot, v }] (0인 것은 뺀다)
 * battle: 네블론 방어구에 장착한 배틀·클래식 카트리지 개수 (글리터의 훈장)
 */
export function buffItems(faceTop, ear, battle) {
  const out = [];
  for (const [slot, name] of [["face_top", faceTop], ["ear", ear]]) {
    const e = name && BUFF_ITEMS[slot][name];
    if (!e) continue;
    const v = e.cd_mult_by_battle ? e.cd_mult_by_battle[Math.max(0, Math.min(2, Math.floor(battle || 0)))] : (e.cd_mult || 0);
    out.push({ name, slot, v });
  }
  return out;
}

/**
 * 화면에서 고른 버프 세팅을 resolve()가 받는 setup으로 만든다.
 * choice: { town, pantsEnhance, shoesEnhance, yellow, stoneCdr, stoneDur, faceTop, ear, battle }
 * 반환: { setup, detail } - detail은 화면에 "적용 값"으로 보여 주기 위한 중간 수치
 */
export function buildSetup(choice) {
  const town = TOWN_BUFFS[choice.town] || { crit: 0, maxi: 0, adapt: 0, boss: 0 };
  const yellow = choice.yellow ? YELLOW_ARTIFACT : 0;
  const pants = (ENHANCE_BASE_PERCENT + (choice.pantsEnhance || 0)) / 100;
  const shoes = (ENHANCE_BASE_PERCENT + (choice.shoesEnhance || 0)) / 100;
  const enc = encourage(choice.stoneCdr || 0, choice.stoneDur || 0);
  const items = buffItems(choice.faceTop, choice.ear, choice.battle);
  const setup = {
    town_crit: town.crit, town_maxi: town.maxi, town_adapt: town.adapt || 0, town_boss: town.boss || 0, town_final: town.final || 0,
    crit_mults: [pants, yellow], maxi_mults: [shoes, yellow],
    cd_base_mults: [PARTY_CRIT_DAMAGE],
    item_cd_mults: items.map(x => x.v).filter(v => v),   // 버프형 아이템 크뎀 곱연산 (악세 세팅은 장비 쪽에서 따로 세서 뺀다)
    item_cd: items,
    guild_boss: GUILD_BOSS_DAMAGE,
    enc_uptime: enc.uptime,
  };
  return { setup, detail: { town, pants, shoes, yellow, enc, items } };
}
