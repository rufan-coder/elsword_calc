// 장비(무기·방어구) 데이터. 실질전투력 시트 ver.3.0.22에서 가져왔다.
//   '무기·방어구 성장'(S3w 무기, S3g 무기 성장, S3b 방어구 성장, S3e 방어구 강화 효과),
//   '아이템·교체 옵션'(S2a 방어구 세트 효과, S8 커스텀 옵션 마스터), '미표시 효과'(방어구 세트·부위 강화·카트리지), '카트리지 표시 스탯'
// 방어구(종류·강화·재련·4세트·옵션 변환·카트리지·시줌)는 악세 세팅에서 쓴다. 무기와 장비 옵션 목록(EQUIP_OPTIONS·EQUIP_OPTION_CATEGORIES)은 아직 계산에 연결하지 않았다.
//
// 수치 단위: 비율은 0.05 = 5%, 공격력·공격력 레벨은 그대로.
// 스탯 키는 다른 데이터와 같다. 그 밖에
//   patk_lv, matk_lv : 물리·마법 공격력 레벨 (무기 공격력 식의 "공격력 레벨"에 더해진다)
//   atk_lv           : 물리·마법 공격력 레벨 둘 다 (무기 성장표는 둘이 늘 같다)
//   atk_pct          : 스탯형 물리·마법 공격력 % 둘 다
//   fixed_atk        : 방어구 고정 공격력 (재련)
//   cho_gang         : 강렬·초월한 스킬 데미지 각각
//   cd_reset         : 스킬 재사용 시간 초기화 확률 (계산하지 않음)
//   party_*          : 파티원에게 주는 효과

/** 강화 배율 (무기·방어구 공용). ENHANCE_MULT[강화 수치], 0강은 1 */
export const ENHANCE_MULT = [1.0, 1.03, 1.06, 1.09, 1.16, 1.23, 1.3, 1.45, 1.6, 1.75, 2.15, 2.55, 2.95, 3.35];

/**
 * 무기 공격력 = (base + perLevel x 공격력 레벨) x ENHANCE_MULT[강화].
 * 공격력 레벨 = 무기 레벨 + 마력석·해방·옵션의 공격력 레벨. 키는 전직 공격력 티어 (0 = 주 공격 타입이 아닌 쪽)
 * 예) 사룡무 12강 6해방, 1티어: (508 + 79.5 x (145 + 25 + 남은 레벨)) x 2.95. 시트는 스탯창 무기 공격력에서 "남은 레벨"을 거꾸로 구한다
 */
export const WEAPON_ATTACK = {"1": {"perLevel": 79.5, "base": 508.0}, "2": {"perLevel": 78.0, "base": 494.0}, "0": {"perLevel": 51.0, "base": 233.0}};

/**
 * 무기 종류. level: 무기 레벨, set: 레이드 세트 (악세 세트 개수에 들어감)
 *   mana    : 강화 수치별 마력석 누적 효과 [0강, 1강, ..., 13강] (사룡무는 없음)
 *   release : 해방 단계별 누적 효과 [0단계, ...] (단죄무는 없음)
 */
export const WEAPON_TYPES = {
  "단죄무": { level: 120, set: null,
    mana: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"all_skill": 0.1}, {"atk_lv": 10.0, "all_skill": 0.1}, {"atk_lv": 10.0, "atk_pct": 0.05, "all_skill": 0.1}, {"atk_lv": 10.0, "atk_pct": 0.05, "crit_dmg": 0.1, "all_skill": 0.1}],
    release: null },
  "혼백무": { level: 125, set: null,
    mana: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"atk_pct": 0.1}, {"atk_lv": 10.0, "atk_pct": 0.1}, {"atk_lv": 10.0, "atk_pct": 0.1, "polar": 0.07}, {"atk_lv": 10.0, "atk_pct": 0.1, "crit_dmg": 0.1, "polar": 0.07}],
    release: [{}, {}, {}, {"atk_lv": 5.0}, {"atk_lv": 10.0}, {"atk_lv": 10.0, "all_skill": 0.1}] },
  "암귀무": { level: 130, set: "심연 레이드 세트",
    mana: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"atk_pct": 0.12}, {"atk_pct": 0.12, "polar": 0.1}, {"atk_lv": 12.0, "atk_pct": 0.12, "polar": 0.1}, {"atk_lv": 12.0, "atk_pct": 0.12, "crit_dmg": 0.1, "polar": 0.1}],
    release: [{}, {"all_skill": 0.1}, {"atk_lv": 10.0, "all_skill": 0.1}, {"atk_lv": 10.0, "all_skill": 0.15}, {"atk_lv": 15.0, "all_skill": 0.15}, {"atk_lv": 20.0, "all_skill": 0.2}] },
  "사룡무": { level: 145, set: "공중요새의 유산",
    mana: null,
    release: [{}, {"all_skill": 0.15}, {"atk_lv": 15.0, "all_skill": 0.15}, {"atk_lv": 20.0, "all_skill": 0.15}, {"atk_lv": 20.0, "all_skill": 0.2}, {"atk_lv": 25.0, "all_skill": 0.2}, {"atk_lv": 25.0, "all_skill": 0.2}] },
};

/** 방어구 부위 기본 공격력 [티어][부위]. 부위 고정 공격력 = 기본 x ENHANCE_MULT[강화] + 재련 fixed_atk */
export const ARMOR_BASE_ATTACK = {"1": {"top": 290.0, "bottom": 483.0, "gloves": 483.0, "shoes": 290.0}, "2": {"top": 284.0, "bottom": 473.0, "gloves": 473.0, "shoes": 284.0}, "0": {"top": 183.0, "bottom": 305.0, "gloves": 305.0, "shoes": 183.0}};

/**
 * 방어구 종류 (상의·하의·장갑·신발 각각에 붙는 값). nebulon: 네블론 방어구 개수에 들어가는지
 *   enhance : 강화 수치별 누적 효과 [0강 ... 13강] (10강 보뎀 5%, 11강부터 엑사·테네 적응력 1% / 네블론 초적응력 2%)
 *   reforge : 재련 단계별 누적 효과 [0 ... 21] (고정 공격력, 크뎀, 강렬·초월, 물마공, 적응력, 초적응력)
 * 테네브로스 하의는 하의 스위칭을 할 수 없다.
 */
export const ARMOR_TYPES = {
  "엑사스케일": { nebulon: 0,
    enhance: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"boss": 0.05}, {"boss": 0.05, "adapt": 0.01}, {"boss": 0.05, "adapt": 0.01}, {"boss": 0.05, "adapt": 0.01}],
    reforge: [{}, {"fixed_atk": 98.0}, {"fixed_atk": 196.0}, {"fixed_atk": 293.0, "crit_dmg": 0.03}, {"fixed_atk": 391.0, "crit_dmg": 0.03}, {"fixed_atk": 487.0, "crit_dmg": 0.03}, {"fixed_atk": 584.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 680.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 776.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 872.0, "crit_dmg": 0.06, "cho_gang": 0.03}, {"fixed_atk": 968.0, "crit_dmg": 0.06, "cho_gang": 0.03}, {"fixed_atk": 1063.0, "crit_dmg": 0.06, "cho_gang": 0.03}, {"fixed_atk": 1158.0, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1252.0, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1347.0, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1440.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1534.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1628.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1721.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.1}, {"fixed_atk": 1814.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.1}, {"fixed_atk": 1906.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.1}, {"adapt": 0.02, "fixed_atk": 2000.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.1}] },
  "테네브로스": { nebulon: 0,
    enhance: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"boss": 0.05}, {"boss": 0.05, "adapt": 0.01}, {"boss": 0.05, "adapt": 0.01}, {"boss": 0.05, "adapt": 0.01}],
    reforge: [{}, {"fixed_atk": 93.0}, {"fixed_atk": 182.0}, {"fixed_atk": 267.0, "crit_dmg": 0.03}, {"fixed_atk": 350.0, "crit_dmg": 0.03}, {"fixed_atk": 430.0, "crit_dmg": 0.03}, {"fixed_atk": 508.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 584.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 658.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 731.0, "crit_dmg": 0.06, "cho_gang": 0.03}, {"fixed_atk": 802.0, "crit_dmg": 0.06, "cho_gang": 0.03}, {"fixed_atk": 872.0, "crit_dmg": 0.06, "cho_gang": 0.03}, {"fixed_atk": 940.0, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1007.0, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1073.0, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1137.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1200.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1262.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.06}, {"fixed_atk": 1323.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.1}, {"fixed_atk": 1383.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.1}, {"fixed_atk": 1442.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.1}, {"adapt": 0.02, "fixed_atk": 1500.0, "atk_pct": 0.02, "crit_dmg": 0.06, "cho_gang": 0.1}] },
  "네블론": { nebulon: 1,
    enhance: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"boss": 0.05}, {"boss": 0.05, "super_adapt": 0.02}, {"boss": 0.05, "super_adapt": 0.02}, {"boss": 0.05, "super_adapt": 0.02}],
    reforge: [{}, {"fixed_atk": 104.0}, {"fixed_atk": 212.0}, {"fixed_atk": 322.0, "crit_dmg": 0.03}, {"fixed_atk": 433.0, "crit_dmg": 0.03}, {"fixed_atk": 546.0, "crit_dmg": 0.03}, {"fixed_atk": 661.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 777.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 894.0, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 1012.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 1131.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 1252.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.03}, {"fixed_atk": 1373.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.06}, {"fixed_atk": 1495.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.06}, {"fixed_atk": 1618.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.06}, {"adapt": 0.02, "fixed_atk": 1741.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.06}, {"adapt": 0.02, "fixed_atk": 1866.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.06}, {"adapt": 0.02, "fixed_atk": 1991.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.06}, {"adapt": 0.02, "fixed_atk": 2117.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.1}, {"adapt": 0.02, "fixed_atk": 2244.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.1}, {"adapt": 0.02, "fixed_atk": 2372.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.1}, {"adapt": 0.02, "super_adapt": 0.005, "fixed_atk": 2500.0, "atk_pct": 0.03, "crit_dmg": 0.03, "cho_gang": 0.1}] },
};

/**
 * 부위 강화 효과 (방어구 종류와 상관없이 강화 수치에 비례). 시트 '미표시 효과' 98~100행, S3e
 *   상의: 최종 데미지 (2 + 강화)%,  하의: 크리티컬 확률 곱연산 (2 + 강화)%,  신발: 극대화 곱연산 (2 + 강화)%  (스탯창에 안 보임)
 *   장갑: 모든 스킬 데미지 강화 x 5% (스탯창에 보임)
 */
export const ARMOR_PART_ENHANCE = {
  top: { final: { base: 0.02, per: 0.01 } },
  bottom: { crit_mult: { base: 0.02, per: 0.01 } },
  shoes: { maxi_mult: { base: 0.02, per: 0.01 } },
  gloves: { all_skill: { base: 0, per: 0.05 } },
};

/**
 * 방어구 4세트 효과. visible: 스탯창에 보이는 효과, hidden: 안 보이는 효과, party: 파티원에게 주는 효과
 *   연산·순환·복원은 엑사스케일·네블론, 나머지는 테네브로스. 테네브로스 세트 이름의 효과(HP 10n 이하 적 피해, 속저 모스뎀)는 시트도 수치로 계산하지 않는다
 */
export const ARMOR_SETS = {
  "연산": { armor: ["엑사스케일", "네블론"], visible: { adapt: 0.02 }, hidden: { final: 0.20 }, party: { party_cd: 0.10 } },
  "순환": { armor: ["엑사스케일", "네블론"], visible: { adapt: 0.02 }, hidden: { final: 0.12, cd_reset: 0.08, cd_accel: 0.10 }, party: { party_cd: 0.10 } },
  "복원": { armor: ["엑사스케일", "네블론"], visible: { adapt: 0.02 }, hidden: {}, party: { party_patk: 0.10, party_matk: 0.10 } },
  "테네브로스-(HP 10n이하 적 n뎀증)": { armor: ["테네브로스"], visible: { adapt: 0.02, patk_pct: 0.05, matk_pct: 0.05 }, hidden: {}, party: {} },
  "테네브로스-(속저 모스뎀)": { armor: ["테네브로스"], visible: { adapt: 0.02, patk_pct: 0.05, matk_pct: 0.05 }, hidden: {}, party: {} },
  "테네브로스-(n확률로 쿨초(벽))": { armor: ["테네브로스"], visible: { adapt: 0.02 }, hidden: { cd_reset: 0.08 }, party: {} },
};

/**
 * 네블론 방어구 옵션 변환 (부위마다 3줄). 시트 '옵션변환 계산' 방어구 줄. 수치는 합연 (0.012 = +1.2%)
 *   stat: 반영 스탯 (null 이면 DPS에 안 들어가는 옵션), perEnhance: 그 부위 강화 수치를 곱하는 옵션, steps: 1~10단계 수치
 */
export const ARMOR_REROLL = {
  "강화 1당 물마공 (%)": {"stat": "atk_pct", "perEnhance": true, "steps": [0.0002, 0.0004, 0.0006, 0.0008, 0.001, 0.0012, 0.0014, 0.0016, 0.0018, 0.002]},
  "강화 1당 크리티컬 데미지": {"stat": "crit_dmg", "perEnhance": true, "steps": [0.0002, 0.0004, 0.0006, 0.0008, 0.001, 0.0012, 0.0014, 0.0016, 0.0018, 0.002]},
  "강화 1당 모든 스킬 데미지": {"stat": "all_skill", "perEnhance": true, "steps": [0.0002, 0.0004, 0.0006, 0.0008, 0.001, 0.0012, 0.0014, 0.0016, 0.0018, 0.002]},
  "추가 지속 피해": {"stat": "add", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "물마공 (%)": {"stat": "atk_pct", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "HP 전 구간 공격뎀": {"stat": "hp100", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "양극화": {"stat": "polar", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "크리티컬 데미지": {"stat": "crit_dmg", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "보스에게 주는 피해": {"stat": "boss", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "강인한 스킬 데미지": {"stat": null, "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "강렬한 스킬 데미지": {"stat": "gang", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "초월한 스킬 데미지": {"stat": "cho", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "모든 스킬 데미지": {"stat": "all_skill", "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "크리티컬": {"stat": "crit", "perEnhance": false, "steps": [0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012]},
  "극대화": {"stat": "maxi", "perEnhance": false, "steps": [0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012]},
  "적 방어력 무시": {"stat": null, "perEnhance": false, "steps": [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01]},
  "일반 몬스터에게 주는 피해": {"stat": null, "perEnhance": false, "steps": [0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012]},
  "지원 스킬 회복 버프 증폭": {"stat": null, "perEnhance": false, "steps": [0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012]}
};

/**
 * 방어구 추가 효과 (시줌). 엑사스케일·테네브로스만 부위마다 3줄 (네블론에는 시줌이 없고 대신 옵션 변환 3줄). 시트 S8 '추가 효과 (시줌)': 크리티컬·극대화·모스뎀%.
 * 수치는 시트에 없어서 사용자에게 받은 값: 크리·극대 1 / 1.5 / 2%, 모스뎀 0.5%. 크리·극대는 점감 전 합연, 모스뎀은 합연
 */
export const ARMOR_SIJUM = {
  "크리티컬": { stat: "crit", steps: [0.01, 0.015, 0.02] },
  "극대화": { stat: "maxi", steps: [0.01, 0.015, 0.02] },
  "모스뎀": { stat: "all_skill", steps: [0.005] },
};

/** 장비 옵션 이름 -> 반영 스탯. unit: pct(비율) | level(고정값·공격력 레벨) */
export const EQUIP_OPTIONS = {
  "기본물공": {"stats": ["patk"], "unit": "level"},
  "기본마공": {"stats": ["matk"], "unit": "level"},
  "물공렙": {"stats": ["patk_lv"], "unit": "level"},
  "마공렙": {"stats": ["matk_lv"], "unit": "level"},
  "물공%": {"stats": ["patk_pct"], "unit": "pct"},
  "마공%": {"stats": ["matk_pct"], "unit": "pct"},
  "크리티컬": {"stats": ["crit"], "unit": "pct"},
  "극대화": {"stats": ["maxi"], "unit": "pct"},
  "크뎀%": {"stats": ["crit_dmg"], "unit": "pct"},
  "보뎀%": {"stats": ["boss"], "unit": "pct"},
  "양극화%": {"stats": ["polar"], "unit": "pct"},
  "모스뎀%": {"stats": ["all_skill"], "unit": "pct"},
  "유강강초(회로)": {"stats": ["gang", "cho"], "unit": "pct"},
  "유강강초(기민아트마석)": {"stats": ["gang", "cho"], "unit": "pct"},
  "초월스뎀": {"stats": ["cho"], "unit": "pct"},
  "강렬스뎀": {"stats": ["gang"], "unit": "pct"},
  "적응력%": {"stats": ["adapt"], "unit": "pct"},
  "모든 스킬 쿨감%": {"stats": ["cdr_all"], "unit": "pct"},
  "쿨초 확률%(벽)": {"stats": ["cd_reset"], "unit": "pct"},
  "HP50%초과 공격뎀": {"stats": ["hp_over"], "unit": "pct"},
  "HP50%이하 공격뎀": {"stats": ["hp_under"], "unit": "pct"},
  "HP100%이하 공격뎀": {"stats": ["hp100"], "unit": "pct"},
  "추피(n%뎀 3초간)": {"stats": ["add"], "unit": "pct"},
  "초적응력%": {"stats": ["super_adapt"], "unit": "pct"},
  "파티-크뎀%": {"stats": ["party_cd"], "unit": "pct"},
  "파티-모스뎀%": {"stats": ["party_all_skill"], "unit": "pct"},
  "파티-물공%": {"stats": ["party_patk"], "unit": "pct"},
  "파티-마공%": {"stats": ["party_matk"], "unit": "pct"},
  "물마공%": {"stats": ["patk_pct", "matk_pct"], "unit": "pct"},
  "물마공렙": {"stats": ["patk_lv", "matk_lv"], "unit": "level"},
  "강화 1당 물마공%": {"stats": ["patk_pct", "matk_pct"], "unit": "pct"},
  "강화 1당 물마공렙": {"stats": ["patk_lv", "matk_lv"], "unit": "level"},
  "강화 1당 크뎀%": {"stats": ["crit_dmg"], "unit": "pct"},
  "강화 1당 모스뎀%": {"stats": ["all_skill"], "unit": "pct"}
};

/**
 * 범주별로 고를 수 있는 옵션 (S8). only: 그 범주가 있는 장비 종류 목록 (null 이면 모든 종류)
 * options 의 문자열은 모든 부위 공통·직접 입력. 객체는 { name, part: 그 부위에만, input: 수치 입력 방식 }
 */
export const EQUIP_OPTION_CATEGORIES = {
  weapon: {
    "추가 효과 (시줌)": {"only": null, "options": ["물공렙", "마공렙", "크리티컬", "극대화"]},
    "소켓 효과 (마법석)": {"only": null, "options": ["크리티컬", "극대화", "보뎀%", "모스뎀%", "강렬스뎀", "초월스뎀", "유강강초(기민아트마석)"]},
    "옵션변환 (사룡무)": {"only": ["사룡무"], "options": ["물마공%", "물마공렙", "크뎀%", "모스뎀%", "강렬스뎀", "초월스뎀", "양극화%", "보뎀%", "추피(n%뎀 3초간)", {"name": "강화 1당 물마공%", "input": "무기 강화당 비율"}, {"name": "강화 1당 크뎀%", "input": "무기 강화당 비율"}, {"name": "강화 1당 모스뎀%", "input": "무기 강화당 비율"}, {"name": "강화 1당 물마공렙", "input": "무기 강화당 레벨"}]},
    "마력 부여 (마력석)": {"only": null, "options": ["기본물공", "기본마공", "물공렙", "마공렙", "물공%", "마공%", "크리티컬", "극대화", "크뎀%", "보뎀%", "모스뎀%", "모든 스킬 쿨감%"]}
},
  armor: {
    "추가 효과 (시줌)": {"only": null, "options": ["크리티컬", "극대화", "모스뎀%"]},
    "소켓 효과 (마법석)": {"only": null, "options": ["크리티컬", "극대화", "보뎀%", "모스뎀%", "강렬스뎀", "초월스뎀", "유강강초(기민아트마석)"]},
    "그림자옵션1 (테네)": {"only": ["테네브로스"], "options": ["모스뎀%", "크뎀%", "크리티컬", "극대화"]},
    "그림자옵션2 (테네)": {"only": ["테네브로스"], "options": [{"name": "추피(n%뎀 3초간)", "part": "top"}, {"name": "양극화%", "part": "top"}, {"name": "파티-크뎀%", "part": "top"}, {"name": "파티-물공%", "part": "top"}, {"name": "파티-마공%", "part": "top"}, {"name": "강렬스뎀", "part": "gloves"}, {"name": "초월스뎀", "part": "gloves"}, {"name": "HP50%초과 공격뎀", "part": "gloves"}, {"name": "HP50%이하 공격뎀", "part": "gloves"}, {"name": "파티-모스뎀%", "part": "gloves"}, {"name": "크리티컬", "part": "shoes"}, {"name": "극대화", "part": "shoes"}]},
    "그림자옵션3 (테네)": {"only": ["테네브로스"], "options": ["쿨초 확률%(벽)"]},
    "리엑터 (테네)": {"only": ["테네브로스"], "options": ["강렬스뎀", "초월스뎀", "양극화%", "보뎀%"]},
    "회로 (엑사&네블론)": {"only": ["엑사스케일", "네블론"], "options": ["크리티컬", "극대화", "보뎀%", {"name": "모스뎀%", "part": "top"}, {"name": "추피(n%뎀 3초간)", "part": "top"}, {"name": "크뎀%", "part": "top"}, {"name": "쿨초 확률%(벽)", "part": "top"}, {"name": "양극화%", "part": "bottom"}, {"name": "HP50%초과 공격뎀", "part": "bottom"}, {"name": "HP50%이하 공격뎀", "part": "bottom"}, {"name": "유강강초(회로)", "part": "gloves"}]},
    "칩 (엑사&네블론)": {"only": ["엑사스케일", "네블론"], "options": ["크뎀%", "양극화%", "모스뎀%", "추피(n%뎀 3초간)", "물공%", "마공%", "보뎀%", "강렬스뎀", "초월스뎀", "HP50%초과 공격뎀", "HP50%이하 공격뎀", "크리티컬", "극대화", "모든 스킬 쿨감%"]},
    "카트리지 (네블론)": {"only": ["네블론"], "options": [{"name": "하이퍼 카트리지 [오버플로우]", "input": "카트리지 레벨"}, {"name": "하이퍼 카트리지 [엑셀레이션]", "input": "카트리지 레벨"}, {"name": "하이퍼 카트리지 [서플라이]", "input": "카트리지 레벨"}, {"name": "서포트 카트리지 Type - 1", "input": "카트리지 레벨"}, {"name": "서포트 카트리지 Type - 2", "input": "카트리지 레벨"}, {"name": "미장착", "input": "수치 없음"}, {"name": "하이퍼 카트리지 [앰플리파이어]", "input": "카트리지 레벨"}, {"name": "하이퍼 카트리지 [택티컬]", "input": "카트리지 레벨"}, {"name": "하이퍼 카트리지 [뮤테이션]", "input": "카트리지 레벨"}, {"name": "서포트 카트리지 Type - 3", "input": "카트리지 레벨"}, {"name": "배틀 카트리지 Type - 1", "input": "카트리지 레벨"}, {"name": "배틀 카트리지 Type - 2", "input": "카트리지 레벨"}, {"name": "배틀 카트리지 Type - 3", "input": "카트리지 레벨"}, {"name": "배틀 카트리지 Type - 4", "input": "카트리지 레벨"}, {"name": "배틀 카트리지 Type - 5", "input": "카트리지 레벨"}, {"name": "클래식 카트리지 Type - 1", "input": "카트리지 레벨"}, {"name": "클래식 카트리지 Type - 2", "input": "카트리지 레벨"}, {"name": "클래식 카트리지 Type - 3", "input": "카트리지 레벨"}, {"name": "클래식 카트리지 Type - 4", "input": "카트리지 레벨"}, {"name": "클래식 카트리지 Type - 5", "input": "카트리지 레벨"}]},
    "옵션변환 (네블론)": {"only": ["네블론"], "options": ["물마공%", "크뎀%", "모스뎀%", "강렬스뎀", "초월스뎀", "크리티컬", "극대화", "보뎀%", "양극화%", "추피(n%뎀 3초간)", "HP100%이하 공격뎀", {"name": "강화 1당 물마공%", "input": "방어구 강화당 비율"}, {"name": "강화 1당 크뎀%", "input": "방어구 강화당 비율"}, {"name": "강화 1당 모스뎀%", "input": "방어구 강화당 비율"}]}
},
};

/** 강화 1당 비례 옵션의 한 단계 수치 (옵션변환 "강화 1당 ~"). 무기 비율·레벨, 방어구 비율 */
export const ENHANCE_STEP_OPTIONS = [0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012];

/**
 * 네블론 카트리지. 같은 종류는 가장 높은 레벨 하나만 센다. 레벨 1~6 의 값 [1레벨, ..., 6레벨]
 *   visible : 스탯창에 보이는 효과 (배틀·클래식·뮤테이션)
 *   hidden  : 안 보이는 효과. final: 최종 데미지(오버플로우), cdr_cut·rearm: 쿨감 감소율·재발동(초)(엑셀레이션),
 *             accel·dur·rearm: 가속 배율·지속·재발동(서플라이, 서포터만), support: 파티 공용 물마공·모스뎀 추가 (기존 12%에 더함, 3.0.20부터 서포터만)
 *   글리터의 훈장 집계는 js/data/buffs.js 와 시트 '미표시 효과' 카트리지 장착 효과 표 참고
 *   앰플리파이어·택티컬·서포트 Type-3·클래식 Type-3~5는 시트에 이름만 있고 수치가 없다
 */
const LV = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03];
export const CARTRIDGES = {
  "하이퍼 카트리지 [오버플로우]": { group: "hyper", hidden: { final: LV } },
  "하이퍼 카트리지 [엑셀레이션]": { group: "hyper", hidden: { cdr_cut: [0.01, 0.015, 0.02, 0.025, 0.03, 0.05], rearm: [10, 9, 8, 7, 5, 4] } },
  "하이퍼 카트리지 [서플라이]": { group: "hyper", supporterOnly: true, hidden: { accel: [1.2, 1.2, 1.2, 1.2, 1.2, 1.2], dur: [5, 5, 5, 5, 5, 5], rearm: [40, 35, 30, 25, 20, 12] } },
  "하이퍼 카트리지 [뮤테이션]": { group: "hyper", visible: { polar: [-0.1, -0.1, -0.1, -0.1, -0.1, -0.1], super_adapt: [0.005, 0.01, 0.015, 0.02, 0.03, 0.04] } },
  "하이퍼 카트리지 [앰플리파이어]": { group: "hyper", unknown: true },
  "하이퍼 카트리지 [택티컬]": { group: "hyper", unknown: true },
  "서포트 카트리지 Type - 1": { group: "support", supporterOnly: true, hidden: { support_atk: LV } },
  "서포트 카트리지 Type - 2": { group: "support", supporterOnly: true, hidden: { support_all_skill: LV } },
  "서포트 카트리지 Type - 3": { group: "support", unknown: true },
  "배틀 카트리지 Type - 1": { group: "battle-classic", visible: { add: LV } },
  "배틀 카트리지 Type - 2": { group: "battle-classic", visible: { all_skill: LV } },
  "배틀 카트리지 Type - 3": { group: "battle-classic", visible: { cho_gang: LV } },
  "배틀 카트리지 Type - 4": { group: "battle-classic", visible: { crit_dmg: LV } },
  "배틀 카트리지 Type - 5": { group: "battle-classic", visible: { boss: LV } },
  "클래식 카트리지 Type - 1": { group: "battle-classic", visible: { polar: LV } },
  "클래식 카트리지 Type - 2": { group: "battle-classic", visible: { cdr_all: LV } },
  "클래식 카트리지 Type - 3": { group: "battle-classic", unknown: true },
  "클래식 카트리지 Type - 4": { group: "battle-classic", unknown: true },
  "클래식 카트리지 Type - 5": { group: "battle-classic", unknown: true },
};
