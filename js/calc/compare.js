// 옵션 비교: 옵션 하나를 더했을 때 DPS가 몇 % 오르는지.

import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "./diminish.js";
import { dpsIndex, has, hasCrit, hasMaxi } from "./stats.js";

/**
 * 비교할 수 있는 옵션 종류.
 *   label : 화면에 보이는 이름
 *   delta : 수치 v만큼 올렸을 때 바뀌는 값. crit_stat / maxi_stat 은 점감 전 스탯에 더한다는 뜻
 *   needs : 이 옵션을 계산하려면 채워져 있어야 하는 스탯 묶음
 */
export const OPTION_KINDS = {
  boss: { label: "보스 데미지", delta: v => ({ boss: v }), needs: "boss" },
  atk_pct: { label: "물리/마법 공격력 % (스텟)", delta: v => ({ atk_pct: v }), needs: "atk_pct" },
  cho: { label: "초월한 스킬 데미지", delta: v => ({ cho: v }), needs: "skill" },
  gang: { label: "강렬한 스킬 데미지", delta: v => ({ gang: v }), needs: "skill" },
  both: { label: "강렬 + 초월 스킬 데미지", delta: v => ({ gang: v, cho: v }), needs: "skill" },
  all_skill: { label: "모든 스킬 데미지", delta: v => ({ all_skill: v }), needs: "all_skill" },
  crit: { label: "크리티컬 확률", delta: v => ({ crit_stat: v }), needs: "crit" },
  maxi: { label: "극대화", delta: v => ({ maxi_stat: v }), needs: "maxi" },
  crit_dmg: { label: "크리티컬 데미지", delta: v => ({ crit_dmg: v }), needs: "crit" },
  polar: { label: "양극화", delta: v => ({ polar: v }), needs: "polar" },
  add: { label: "추가 피해", delta: v => ({ add: v }), needs: "add" },
  hp_over: { label: "HP 50% 초과 적 데미지", delta: v => ({ hp_over: v }), needs: "hp_over" },
  hp_under: { label: "HP 50% 이하 적 데미지", delta: v => ({ hp_under: v }), needs: "hp_under" },
  hp100: { label: "HP 100% 이하 적 데미지", delta: v => ({ hp100: v }), needs: "hp100" },
};

/** 실전 수치 base에 변화량 delta를 더한 새 수치 */
export function applyOption(base, delta) {
  const s = Object.assign({}, base);
  // 딜 비중 환산은 올리기 전 수치 기준으로 고정한다 (dpsIndex 참고)
  if (s._base_gang == null) s._base_gang = base.gang || 0;
  if (s._base_cho == null) s._base_cho = base.cho || 0;
  for (const [k, v] of Object.entries(delta)) {
    if (k === "crit_stat") s.crit = critFromStat(statFromCrit(s.crit) + v);
    else if (k === "maxi_stat") s.maxi = maxiFromStat(statFromMaxi(s.maxi) + v);
    else s[k] = (s[k] || 0) + v;
  }
  return s;
}

/** 계산에 필요한 입력이 비어 있으면 무엇이 비었는지 문구로 돌려준다. 다 있으면 null */
function missingFor(needs, s) {
  if (needs === "crit") return hasCrit(s) ? null : "크리티컬 확률과 크리티컬 데미지";
  if (needs === "maxi") return hasMaxi(s) ? null : "극대화, 공격력, 최댓값";
  if (needs === "atk_pct") return has(s, "atk_pct") ? null : "공격력, 최댓값, 무기 공격력";
  if (needs === "skill") return (has(s, "cho") || has(s, "gang")) ? null : "초월·강렬 스킬 데미지";
  return has(s, needs) ? null : OPTION_KINDS[needs] ? OPTION_KINDS[needs].label : needs;
}

/**
 * 옵션별 DPS 상승률.
 * options: [{ name, kind, value, price }]
 * 반환: 같은 순서의 배열에 gain(상승률), miss(비어 있는 입력), per(가격 1당 상승률)를 붙인 것
 */
export function compare(base, options) {
  const before = dpsIndex(base);
  return options.map(o => {
    const kind = OPTION_KINDS[o.kind];
    const miss = missingFor(kind.needs, base);
    const gain = miss ? null : dpsIndex(applyOption(base, kind.delta(o.value))) / before - 1;
    return Object.assign({}, o, { gain, miss, per: gain != null && o.price > 0 ? gain / o.price : null });
  });
}
