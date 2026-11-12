// 악세·아바타 교체 계산: 지금 낀 것과 바꿔 볼 것을 비교해 세트 효과까지 합친 DPS 변화를 구한다.
//
// 장착 상태(gear)의 모양
//   {
//     avatar:  { weapon, support, face_top, face_mid, face_low, top, bottom, arm, ear, neck, ring }   아바타 악세 이름 (없으면 null)
//     normal:  { ...같은 부위, ring2 }                                                              일반 악세 이름
//     outfit:  한 벌 아바타 이름,  wavatar: 무기 아바타 이름
//     armor:   { hair, top, bottom, gloves, shoes }                                                레어 아바타 세트 이름
//     atma:    { element: "유수", grades: { face_mid, face_low, arm, neck } }                       아트마 속성과 부위별 등급
//     avatarSets: [세트 이름...] | null   무악 세트를 4개 이상 맞췄을 때 켜 둔 세트 (null 이면 자동)
//   }
//
// 계산 방법
//   스탯창 값에는 지금 낀 것의 효과가 이미 들어 있다. 그래서
//     바꾼 뒤 스탯창 = 지금 스탯창 - 지금 장비의 "보이는 효과" + 바꾼 장비의 "보이는 효과"
//   곱연 크뎀과 최종 데미지는 스탯창에 안 보이므로 양쪽 모두 따로 곱해서 비교한다.

import { ACCESSORIES, NEW_ACCESSORIES, ARMOR_AVATARS, WEAPON_AVATARS, OUTFITS, SETS, ATMA, AVATAR_SET_LIMIT } from "../data/accessories.js";
import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "./diminish.js";
import { resolve, dpsIndex, has } from "./stats.js";

const ACC_BY_NAME = new Map([...ACCESSORIES, ...NEW_ACCESSORIES].map(a => [a.name, a]));
const WAVATAR_BY_NAME = new Map(WEAPON_AVATARS.map(w => [w.name, w]));
const OUTFIT_BY_NAME = new Map(OUTFITS.map(o => [o.name, o]));

/** 계산기가 다루지 않는 효과 (보여 주기만) */
export const IGNORED = { aspd: "동작 속도", extra_dmg: "추가 데미지", pdef_ign: "물리 방어 무시", mdef_ign: "마법 방어 무시", tough: "강인한 스킬 데미지", active: "액티브 스킬 데미지" };

export const STAT_NAMES = {
  crit: "크리티컬", maxi: "극대화", crit_dmg: "크리티컬 데미지", boss: "보스 데미지", polar: "양극화", all_skill: "모든 스킬 데미지",
  cho: "초월한 스킬 데미지", gang: "강렬한 스킬 데미지", hp_over: "HP 50% 초과 적 데미지", hp_under: "HP 50% 이하 적 데미지", hp100: "HP 100% 이하 적 데미지",
  add: "추가 지속 피해", adapt: "적응력", cdr_all: "모든 스킬 재사용 시간 감소", atk_pct: "공격력 % (스텟)",
  cd_mult: "크뎀 곱연산", final: "최종 데미지", ...IGNORED,
};

export const emptyGear = () => ({
  avatar: {}, normal: {}, outfit: null, wavatar: null, armor: {},
  atma: { element: "유수", grades: {} }, avatarSets: null,
});

/** 아트마 악세 등급: 만다라는 이름에, 나머지는 따로 고른 값에 있다 */
function atmaGrade(item, slot, gear) {
  const m = item.name.match(/\((레전드리|유니크|엘리트|레어|일반),/);
  return m ? m[1] : (gear.atma.grades[slot] || "유니크");
}

/** 효과 묶음에 다른 효과를 더한다 (곱연 크뎀·최종 데미지는 따로 모은다) */
function addStats(acc, stats, atkType) {
  for (const [k, v] of Object.entries(stats || {})) {
    if (k === "cd_mult") acc.cdMults.push(v);
    else if (k === "final") acc.finals.push(v);
    else if (k === "patk_pct" || k === "matk_pct") { if ((k === "patk_pct") === (atkType === "물리")) acc.visible.atk_pct = (acc.visible.atk_pct || 0) + v; }
    else if (k === "patk" || k === "matk") continue;   // 고정 공격력은 무기 공격력에 비해 아주 작아서 뺀다
    else if (IGNORED[k]) acc.ignored[k] = (acc.ignored[k] || 0) + v;
    else acc.visible[k] = (acc.visible[k] || 0) + v;
  }
}

/** 세트 개수 세기 */
function countSets(gear) {
  const count = new Map(), bump = name => { if (name && name !== "없음") count.set(name, (count.get(name) || 0) + 1); };
  for (const name of Object.values(gear.avatar)) { const a = ACC_BY_NAME.get(name); if (a) bump(a.set); }
  for (const name of Object.values(gear.normal)) { const a = ACC_BY_NAME.get(name); if (a && !a.atma) bump(a.set); }
  const w = WAVATAR_BY_NAME.get(gear.wavatar); if (w) bump(w.set);
  for (const set of Object.values(gear.armor)) if (SETS[set]) bump(set);
  return count;
}

/** 켜지는 세트 단계들: [{ name, kind, count, stages: [2, 3] }] */
function setStages(count) {
  const out = [];
  for (const [name, n] of count) {
    const s = SETS[name];
    if (!s) continue;
    const stages = Object.keys(s.stages).map(Number).filter(k => k <= n);
    if (stages.length) out.push({ name, kind: s.kind, count: n, stages });
  }
  return out;
}

/** 아트마 세트: 부위 4개 이상이면 위 등급부터 세어 4개째가 채워지는 등급 (유니크까지) */
export function atmaSet(gear) {
  const grades = [];
  for (const slot of ATMA.pieces) {
    const item = ACC_BY_NAME.get(gear.normal[slot]);
    if (item && item.atma) grades.push(atmaGrade(item, slot, gear));
  }
  const rank = g => ATMA.grades.indexOf(g);
  grades.sort((a, b) => rank(a) - rank(b));
  if (grades.length < ATMA.need) return { count: grades.length, grade: null, element: gear.atma.element };
  let grade = grades[ATMA.need - 1];
  if (rank(grade) < rank(ATMA.maxGrade)) grade = ATMA.maxGrade;
  return { count: grades.length, grade, element: gear.atma.element };
}

/**
 * 장착 상태의 효과 합계.
 * avatarChoice: 무악 세트가 4개 이상일 때 켤 세트 이름 목록 (없으면 개수가 많은 순)
 */
export function gearEffects(gear, atkType, avatarChoice) {
  const acc = { visible: {}, ignored: {}, cdMults: [], finals: [], unknown: [] };
  const items = [];
  for (const layer of ["avatar", "normal"]) for (const name of Object.values(gear[layer])) { const a = ACC_BY_NAME.get(name); if (a) items.push(a); }
  for (const a of items) { addStats(acc, a.stats, atkType); if (a.unknown) acc.unknown.push(a.name); }
  const w = WAVATAR_BY_NAME.get(gear.wavatar); if (w) addStats(acc, w.stats, atkType);
  const o = OUTFIT_BY_NAME.get(gear.outfit); if (o) addStats(acc, o.stats, atkType);
  for (const [piece, set] of Object.entries(gear.armor)) {
    if (ARMOR_AVATARS[set]) addStats(acc, ARMOR_AVATARS[set][piece], atkType);
    else if (set) acc.unknown.push(`${set} (레어 아바타)`);
  }

  // 세트 효과. 무악 세트는 AVATAR_SET_LIMIT 개까지만
  const all = setStages(countSets(gear));
  const avatarSets = all.filter(s => s.kind === "avatar");
  let on = avatarSets;
  if (avatarSets.length > AVATAR_SET_LIMIT) {
    const pick = avatarChoice && avatarChoice.filter(n => avatarSets.some(s => s.name === n)).slice(0, AVATAR_SET_LIMIT);
    on = pick && pick.length
      ? avatarSets.filter(s => pick.includes(s.name))
      : avatarSets.slice().sort((a, b) => b.count - a.count || b.stages.length - a.stages.length).slice(0, AVATAR_SET_LIMIT);
  }
  const sets = all.map(s => Object.assign({}, s, { active: s.kind !== "avatar" || on.includes(s) }));
  for (const s of sets) if (s.active) for (const k of s.stages) addStats(acc, SETS[s.name].stages[k], atkType);

  // 아트마 세트
  const atma = atmaSet(gear), effect = ATMA.sets[`${atma.element}의 아트마`];
  atma.active = !!(atma.grade && effect);
  if (atma.active) {
    if (effect.final) acc.finals.push(effect.final[atma.grade]);
    if (effect.cd_mult) acc.cdMults.push(effect.cd_mult[atma.grade]);
    if (effect.fixed) addStats(acc, effect.fixed, atkType);
  }
  return Object.assign(acc, { sets, atma, avatarSetCount: avatarSets.length });
}

/** 스탯창 값에 보이는 효과 변화량을 반영한다. 칸이 비어 있어 반영 못 한 효과는 blank 에 모은다 */
function shiftWindow(win, delta) {
  const out = Object.assign({}, win), blank = [];
  for (const [k, v] of Object.entries(delta)) {
    if (Math.abs(v) < 1e-12) continue;
    if (k === "crit") { if (has(win, "crit")) out.crit = critFromStat(Math.max(0, statFromCrit(win.crit) + v)); else blank.push(k); }
    else if (k === "maxi") { if (has(win, "maxi")) out.maxi = maxiFromStat(Math.max(0, statFromMaxi(win.maxi) + v)); else blank.push(k); }
    else if (k === "cdr_all") {
      if (!has(win, "cdr_gang") && !has(win, "cdr_cho")) blank.push(k);
      for (const c of ["cdr_gang", "cdr_cho"]) if (has(win, c)) out[c] = win[c] + v;
    }
    else if (has(win, k)) out[k] = win[k] + v;
    else blank.push(k);
  }
  return { win: out, blank };
}

const minus = (a, b) => {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (a[k] || 0) - (b[k] || 0); if (Math.abs(d) > 1e-12) out[k] = d; }
  return out;
};
const prodOf = xs => xs.reduce((a, x) => a * (1 + x), 1);

function dps(win, job, resist, setup, fx) {
  const s = resolve(win, job, resist, Object.assign({}, setup, { cd_base_mults: setup.cd_base_mults.concat(fx.cdMults) }));
  return dpsIndex(s) * prodOf(fx.finals);
}

/** 무악 세트가 4개 이상이면, 켤 수 있는 조합 중 score(세트 이름 목록)가 가장 높은 것. 3개 이하면 null */
function bestAvatarChoice(gear, score) {
  const names = setStages(countSets(gear)).filter(s => s.kind === "avatar").map(s => s.name);
  if (names.length <= AVATAR_SET_LIMIT) return null;
  let best = null;
  const pick = (start, chosen) => {
    if (chosen.length === AVATAR_SET_LIMIT) {
      const v = score(chosen);
      if (!best || v > best.v) best = { v, chosen: chosen.slice() };
      return;
    }
    for (let i = start; i < names.length; i++) { chosen.push(names[i]); pick(i + 1, chosen); chosen.pop(); }
  };
  pick(0, []);
  return best.chosen;
}

/**
 * 지금 장착(before)과 바꾼 장착(after) 비교.
 * ctx: { win, job, resist, setup } (화면의 스탯창 값과 버프 세팅)
 * 반환: { gain, before, after, delta: 보이는 효과 변화, blank: 스탯창이 비어 반영 못 한 효과 }
 */
export function compareGear(ctx, beforeGear, afterGear) {
  const { win, job, resist, setup } = ctx, atkType = job ? job.type : "물리";
  const before = gearEffects(beforeGear, atkType, beforeGear.avatarSets);
  const baseDps = dps(win, job, resist, setup, before);
  const afterFor = choice => {
    const fx = gearEffects(afterGear, atkType, choice);
    const shifted = shiftWindow(win, minus(fx.visible, before.visible));
    return { fx, shifted, value: dps(shifted.win, job, resist, setup, fx) };
  };
  // 바꾼 쪽은 사용자가 고르지 않았으면 가장 좋은 무악 세트 조합을 고른다
  const choice = afterGear.avatarSets || bestAvatarChoice(afterGear, names => afterFor(names).value);
  const after = afterFor(choice);
  return {
    gain: after.value / baseDps - 1,
    before, after: after.fx,
    delta: minus(after.fx.visible, before.visible),
    hidden: { cd: [before.cdMults, after.fx.cdMults], final: [before.finals, after.fx.finals] },
    ignored: minus(after.fx.ignored, before.ignored),
    blank: after.shifted.blank,
  };
}
