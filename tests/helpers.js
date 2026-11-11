// 테스트에서 같이 쓰는 기준 캐릭터와 버프 세팅.
// 기대값은 실투력 계산 시트의 화면 값에서 가져왔다 (README의 "검증" 참고).

import { CLASS } from "../js/data/classes.js";
import { ENCOURAGE } from "../js/data/buffs.js";

/** 소수 digits자리까지 같은지 */
export function near(actual, expected, digits = 4) {
  const tol = 0.5 * 10 ** -digits;
  if (Math.abs(actual - expected) > tol) throw new Error(`기대 ${expected} (±${tol}), 실제 ${actual}`);
}

// 격려: 비전의 원석 재사용 시간 감소 30% -> 쿨 66초, 지속 36초
export const ENC_UPTIME = (ENCOURAGE.baseDuration * 1.5) / (ENCOURAGE.baseCooldown * (1 - 1 / 3 - 0.30));

/** 시트 ver.2.21.4 Main 탭의 예시 캐릭터 (니샤 라비린스, 네블론 레이드) */
export const NISHA = {
  job: CLASS["니샤 라비린스"],
  resist: 0.30,
  win: { crit: 0.862, crit_dmg: 2.015, maxi: 0.6887, A: 131653, A_max: 179959, W: 48698, boss: 1.991, all_skill: 1.315, cho: 1.296, gang: 0.986 },
  // 온천 버프, 하의·신발 11강, 황색 2세트, 파티 크뎀 10%, 각인석 크뎀 6%(가동률 보정 1.275%),
  // 시트에 켜져 있던 마에스트로 헤일로 2%·글리터의 훈장 0.5%까지 포함
  setup: { town_crit: 0.05, town_maxi: 0.05, crit_mults: [0.13, 0.08], maxi_mults: [0.13, 0.08], cd_base_mults: [0.10, 0.01275, 0.02, 0.005], guild_boss: 0.025, enc_uptime: ENC_UPTIME },
};

/** 시트 ver.2.21.1 에 직접 입력해 확인한 캐릭터 (트윈즈 피카로, 네블론 레이드) */
export const PICARO = {
  job: CLASS["트윈즈 피카로"],
  resist: 0.30,
  win: { crit: 0.83, crit_dmg: 1.994, maxi: 0.651, A: 124172, A_max: 169072, W: 44020, boss: 1.90, gang: 0.995, cho: 1.295, share_gang: 5, share_cho: 95 },
  setup: { town_crit: 0.05, town_maxi: 0.05, crit_mults: [0.13, 0.08], maxi_mults: [0.13, 0.08], cd_base_mults: [0.10, 0.0106], guild_boss: 0.025, enc_uptime: ENC_UPTIME },
};
