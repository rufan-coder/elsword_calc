// 스탯창에 보이지 않는 버프·장비 효과의 수치.

/**
 * 마을 버프. 스탯창에는 안 보이고 실전에서 더해진다.
 *   crit, maxi : 크리티컬·극대화 (스텟 합연산)
 *   adapt      : 적응력 (스탯창 적응력과 합쳐서 상한 60%를 적용)
 *   boss       : 보스 데미지 (합연산)
 *   final      : 최종 데미지. 같은 버프끼리 비교하는 옵션 비교에는 영향이 없고, 악세 세팅에서 마을 버프를 바꿔 볼 때만 쓴다
 * 공존의 축제 버프(적응력 3%, 최종 데미지 5%)는 이벤트 기간에만 있어서 뺐다.
 * 다시 열리면 "공존의 축제 버프": { crit: 0, maxi: 0, adapt: 0.03, boss: 0, final: 0.05 } 를 넣고 index.html 의 마을 버프 목록에도 더한다.
 */
export const TOWN_BUFFS = {
  "엘 하우스(강화)": { crit: 0.05, maxi: 0.05, adapt: 0, boss: 0.02 },
  "온천 버프": { crit: 0.05, maxi: 0.05, adapt: 0, boss: 0 },
  "수색대원의 결의": { crit: 0, maxi: 0, adapt: 0.02, boss: 0.02 },
  "미사용": { crit: 0, maxi: 0, adapt: 0, boss: 0 },
};

/** 하의(크리티컬)·신발(극대화) 강화 수치 효과: (2 + 강화 수치)% 곱연산 */
export const ENHANCE_BASE_PERCENT = 2;
export const MAX_ENHANCE = 13;

/** 황색 아티팩트 2세트: 크리티컬·극대화 8% 곱연산 */
export const YELLOW_ARTIFACT = 0.08;

/** 파티 크리티컬 데미지 버프: 기본 크뎀(150%)에 곱연산 */
export const PARTY_CRIT_DAMAGE = 0.10;

/** 길드 스킬: 보스 데미지 합연산 */
export const GUILD_BOSS_DAMAGE = 0.025;

/** 펫의 격려 */
export const ENCOURAGE = {
  critMult: 0.652,       // 발동 중 크리티컬 확률 곱연산
  baseCooldown: 180,     // 초
  baseDuration: 24,      // 초
  growthCooldownCut: 1 / 3,   // 응원 성장 최대치의 재사용 시간 감소
  growthDurationUp: 0.5,      // 끈기 성장 최대치의 지속 시간 증가
};
