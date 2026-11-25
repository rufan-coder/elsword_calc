// 악세·아바타 교체 계산: 지금 낀 것과 바꿔 볼 것을 비교해 세트 효과까지 합친 DPS 변화를 구한다.
//
// 장착 상태(gear)의 모양
//   {
//     avatar:  { weapon, support, face_top, face_mid, face_low, top, bottom, arm, ear, neck, ring }   아바타 악세 이름 (없으면 null)
//     normal:  { ...같은 부위, ring2 }                                                              일반 악세 이름
//     outfit:  한 벌 아바타 이름,  wavatar: 무기 아바타 이름,  weapon: 무기 종류 (사룡무 등. 레이드 세트 개수에만 쓴다)
//     armor:   { hair, top, bottom, gloves, shoes }                                                레어 아바타 세트 이름
//     atma:    { element: "유수", grades: { face_mid, face_low, arm, neck } }                       아트마 속성과 부위별 등급
//     avatarSets: [세트 이름...] | null   무악 세트를 4개 이상 맞췄을 때 켜 둔 세트 (null 이면 자동)
//     town:    마을 버프 이름 | null      바꿔 볼 마을 버프 (null 이면 스펙 계산에서 고른 버프 그대로)
//     spirit:  0~2 | null                 아티팩트 정령석 중 양극화로 고른 개수 (나머지는 물마). null 이면 입력 안 함
//     equip:   { top, bottom, gloves, shoes, set } | null   방어구. 부위마다 { type: "네블론", enh: 강화, ref: 재련 } 또는 null,
//              set: 4세트 이름 (js/data/equipment.js 의 ARMOR_SETS). 지금 방어구를 넣은 부위만 계산한다
//   }
//
// 계산 방법
//   스탯창 값에는 지금 낀 것의 효과가 이미 들어 있다. 그래서
//     바꾼 뒤 스탯창 = 지금 스탯창 - 지금 장비의 "보이는 효과" + 바꾼 장비의 "보이는 효과"
//   곱연 크뎀과 최종 데미지는 스탯창에 안 보이므로 양쪽 모두 따로 곱해서 비교한다.
//   글리터의 훈장의 곱연 크뎀은 버프 세팅의 배틀·클래식 카트리지 개수(setup.glitter_battle)를 따른다.
//   방어구의 하의·신발 강화(크리·극대 곱연산)는 버프 세팅의 하의·신발 강화 수치를 바뀐 강화 차이만큼 옮겨서 센다.
//   방어구 고정 공격력(재련)은 다른 고정 공격력처럼 계산하지 않는다.

import { ACCESSORIES, NEW_ACCESSORIES, ARMOR_AVATARS, WEAPON_AVATARS, OUTFITS, WEAPONS, SETS, ATMA, AVATAR_SET_LIMIT, SPIRIT_STONES } from "../data/accessories.js";
import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "./diminish.js";
import { resolve, dpsIndex, has } from "./stats.js";
import { setupWithTown, buffItems } from "./buffs.js";
import { BUFF_ITEMS } from "../data/buffs.js";
import { CRIT_MAXI_PER_SLOT } from "../data/stones.js";
import { ARMOR_TYPES, ARMOR_PART_ENHANCE, ARMOR_SETS } from "../data/equipment.js";

const ACC_BY_NAME = new Map([...ACCESSORIES, ...NEW_ACCESSORIES].map(a => [a.name, a]));
const WAVATAR_BY_NAME = new Map(WEAPON_AVATARS.map(w => [w.name, w]));
const OUTFIT_BY_NAME = new Map(OUTFITS.map(o => [o.name, o]));
const WEAPON_BY_NAME = new Map(WEAPONS.map(w => [w.name, w]));

/** 계산기가 다루지 않는 효과 (보여 주기만) */
export const IGNORED = { aspd: "동작 속도", extra_dmg: "추가 데미지", pdef_ign: "물리 방어 무시", mdef_ign: "마법 방어 무시", tough: "강인한 스킬 데미지", active: "액티브 스킬 데미지" };

export const STAT_NAMES = {
  crit: "크리티컬", maxi: "극대화", crit_dmg: "크리티컬 데미지", boss: "보스 데미지", polar: "양극화", all_skill: "모든 스킬 데미지",
  cho: "초월한 스킬 데미지", gang: "강렬한 스킬 데미지", hp_over: "HP 50% 초과 적 데미지", hp_under: "HP 50% 이하 적 데미지", hp100: "HP 100% 이하 적 데미지",
  add: "추가 지속 피해", adapt: "적응력", cdr_all: "모든 스킬 재사용 시간 감소", atk_pct: "공격력 % (스텟)",
  cd_mult: "크뎀 곱연산", final: "최종 데미지", ...IGNORED,
};

export const emptyGear = () => ({
  avatar: {}, normal: {}, outfit: null, wavatar: null, weapon: null, armor: {},
  atma: { element: "유수", grades: {} }, avatarSets: null, town: null, spirit: null, equip: null,
});

// ----- 방어구 (엑사스케일·테네브로스·네블론) -----
export const EQUIP_PARTS = ["top", "bottom", "gloves", "shoes"];
/** 장비 데이터의 효과 묶음 -> 계산용 (강렬·초월 각각, 고정 공격력은 뺀다). 같은 묶음은 같은 객체로 돌려준다 (prepared 캐시) */
const EQUIP_STATS = new Map();
function equipStats(stats) {
  if (!EQUIP_STATS.has(stats)) {
    const out = {};
    for (const [k, v] of Object.entries(stats || {})) {
      if (k === "fixed_atk") continue;
      if (k === "cho_gang") { out.cho = (out.cho || 0) + v; out.gang = (out.gang || 0) + v; }
      else out[k] = (out[k] || 0) + v;
    }
    EQUIP_STATS.set(stats, out);
  }
  return EQUIP_STATS.get(stats);
}
const PART_STATS = new Map();
const partStat = (key, v) => { const k = key + v; if (!PART_STATS.has(k)) PART_STATS.set(k, { [key]: v }); return PART_STATS.get(k); };

/**
 * 방어구 효과를 더한다. 부위마다 강화·재련 효과, 부위 강화 효과(상의 최종뎀, 장갑 모스뎀, 하의·신발은 partMult 로 따로), 4세트 효과.
 * acc 에 equipSet({ name, active }), nebulon(네블론 부위 수), fixedAtk(고정 공격력 합, 계산 안 함), partMult({ crit, maxi }) 를 남긴다
 */
function addEquip(acc, equip, atkType) {
  acc.equipSet = null; acc.nebulon = 0; acc.fixedAtk = 0; acc.partMult = {};
  if (!equip) return;
  const P = ARMOR_PART_ENHANCE;
  for (const part of EQUIP_PARTS) {
    const e = equip[part], t = e && ARMOR_TYPES[e.type];
    if (!t) continue;
    const enh = t.enhance[e.enh] || {}, ref = t.reforge[e.ref] || {};
    addStats(acc, equipStats(enh), atkType);
    addStats(acc, equipStats(ref), atkType);
    acc.fixedAtk += ref.fixed_atk || 0;
    if (t.nebulon) acc.nebulon++;
    if (part === "top") acc.finals.push(P.top.final.base + P.top.final.per * e.enh);
    if (part === "gloves") addStats(acc, partStat("all_skill", P.gloves.all_skill.base + P.gloves.all_skill.per * e.enh), atkType);
    if (part === "bottom") acc.partMult.crit = P.bottom.crit_mult.base + P.bottom.crit_mult.per * e.enh;
    if (part === "shoes") acc.partMult.maxi = P.shoes.maxi_mult.base + P.shoes.maxi_mult.per * e.enh;
  }
  const set = equip.set && ARMOR_SETS[equip.set];
  if (set) {
    const active = EQUIP_PARTS.every(p => equip[p] && set.armor.includes(equip[p].type));
    acc.equipSet = { name: equip.set, active };
    if (active) {
      addStats(acc, set.visible, atkType);
      if (set.hidden.final) acc.finals.push(set.hidden.final);
    }
  }
}

/** 하의·신발 강화가 바뀐 만큼 버프 세팅의 하의 크리·신발 극대 곱연산(crit_mults[0], maxi_mults[0])을 옮긴다 */
function withPartEnhance(st, fx, before) {
  const a = fx.partMult || {}, b = before.partMult || {};
  const dc = a.crit != null && b.crit != null ? a.crit - b.crit : 0;
  const dm = a.maxi != null && b.maxi != null ? a.maxi - b.maxi : 0;
  if (Math.abs(dc) < 1e-12 && Math.abs(dm) < 1e-12) return st;
  return Object.assign({}, st, {
    crit_mults: [(st.crit_mults[0] || 0) + dc, ...st.crit_mults.slice(1)],
    maxi_mults: [(st.maxi_mults[0] || 0) + dm, ...st.maxi_mults.slice(1)],
  });
}

/** 아티팩트 정령석 효과: 양극화로 고른 개수(0~2)마다 하나씩 만들어 둔다 (prepared 가 묶음 단위로 기억하므로) */
const SPIRIT_FX = Array.from({ length: SPIRIT_STONES.count + 1 }, (_, n) => {
  const out = {}, add = (stats, times) => { for (const [k, v] of Object.entries(stats)) out[k] = (out[k] || 0) + v * times; };
  add(SPIRIT_STONES.polar, n); add(SPIRIT_STONES.atk, SPIRIT_STONES.count - n);
  return out;
});

/** 아트마 악세 등급: 만다라는 이름에, 나머지는 따로 고른 값에 있다 */
function atmaGrade(item, slot, gear) {
  const m = item.name.match(/\((레전드리|유니크|엘리트|레어|일반),/);
  return m ? m[1] : (gear.atma.grades[slot] || "유니크");
}

/**
 * 능력치 묶음을 계산에 쓰기 좋은 모양으로 한 번만 바꿔 둔다 (자동 찾기에서 수만 번 부르므로).
 * [종류, 키, 값] 목록. 종류: 0 스탯창에 보이는 효과, 1 곱연 크뎀, 2 최종 데미지, 3 계산하지 않는 효과
 */
const PREPARED = { 물리: new WeakMap(), 마법: new WeakMap() };
function prepared(stats, atkType) {
  const cache = PREPARED[atkType] || PREPARED.물리;
  let list = cache.get(stats);
  if (list) return list;
  list = [];
  for (const [k, v] of Object.entries(stats)) {
    if (k === "cd_mult") list.push([1, k, v]);
    else if (k === "final") list.push([2, k, v]);
    else if (k === "patk_pct" || k === "matk_pct") { if ((k === "patk_pct") === (atkType !== "마법")) list.push([0, "atk_pct", v]); }
    else if (k === "patk" || k === "matk") continue;   // 고정 공격력은 무기 공격력에 비해 아주 작아서 뺀다
    else if (IGNORED[k]) list.push([3, k, v]);
    else list.push([0, k, v]);
  }
  cache.set(stats, list);
  return list;
}

/**
 * 일반 악세의 능력치. 곱연 크뎀이 카트리지 개수에 따라 바뀌는 것(글리터의 훈장)은 battle 개수의 값으로 바꾼다.
 * battle 이 null 이면 데이터 값 그대로 (카트리지 2개 이상과 같음). 같은 묶음을 돌려줘야 prepared()의 캐시가 맞아서 개수별로 한 번만 만든다.
 */
const BY_BATTLE = new Map();
export function itemStats(a, battle) {
  const e = battle != null && a.layer === "normal" && (BUFF_ITEMS[a.slot] || {})[a.name];
  if (!e || !e.cd_mult_by_battle) return a.stats;
  const key = `${a.name}|${battle}`;
  if (!BY_BATTLE.has(key)) {
    const v = buffItems(a.slot === "face_top" ? a.name : "", a.slot === "ear" ? a.name : "", battle)[0].v;
    const s = Object.assign({}, a.stats);
    delete s.cd_mult;
    if (v) s.cd_mult = v;
    BY_BATTLE.set(key, s);
  }
  return BY_BATTLE.get(key);
}

/** 효과 묶음에 다른 효과를 더한다 (곱연 크뎀·최종 데미지는 따로 모은다) */
function addStats(acc, stats, atkType) {
  if (!stats) return;
  for (const [kind, k, v] of prepared(stats, atkType)) {
    if (kind === 0) acc.visible[k] = (acc.visible[k] || 0) + v;
    else if (kind === 1) acc.cdMults.push(v);
    else if (kind === 2) acc.finals.push(v);
    else acc.ignored[k] = (acc.ignored[k] || 0) + v;
  }
}

/** 세트 개수 세기 */
export function countSets(gear) {
  const count = new Map(), bump = name => { if (name && name !== "없음") count.set(name, (count.get(name) || 0) + 1); };
  for (const name of Object.values(gear.avatar)) { const a = ACC_BY_NAME.get(name); if (a) bump(a.set); }
  for (const name of Object.values(gear.normal)) { const a = ACC_BY_NAME.get(name); if (a && !a.atma) bump(a.set); }
  const w = WAVATAR_BY_NAME.get(gear.wavatar); if (w) bump(w.set);
  const weapon = WEAPON_BY_NAME.get(gear.weapon); if (weapon) bump(weapon.set);
  for (const set of Object.values(gear.armor)) if (SETS[set]) bump(set);
  return count;
}

const STAGE_NUMS = Object.fromEntries(Object.entries(SETS).map(([n, s]) => [n, Object.keys(s.stages).map(Number)]));

/** 켜지는 세트 단계들: [{ name, kind, count, stages: [2, 3] }]. ignore 에 있는 세트는 없는 것으로 본다 */
function setStages(count, ignore) {
  const out = [];
  for (const [name, n] of count) {
    const s = SETS[name];
    if (!s || (ignore && ignore.has(name))) continue;
    const stages = STAGE_NUMS[name].filter(k => k <= n);
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
 * ignore      : 세트 효과를 세지 않을 세트 이름 Set (자동 찾기가 오래된 세트를 맞추지 않게 할 때)
 * battle      : 버프 세팅의 배틀·클래식 카트리지 개수 (글리터의 훈장 곱연 크뎀. null 이면 데이터 값)
 */
export function gearEffects(gear, atkType, avatarChoice, ignore, battle = null) {
  const acc = { visible: {}, ignored: {}, cdMults: [], finals: [], unknown: [] };
  const items = [];
  for (const layer of ["avatar", "normal"]) for (const name of Object.values(gear[layer])) { const a = ACC_BY_NAME.get(name); if (a) items.push(a); }
  for (const a of items) { addStats(acc, itemStats(a, battle), atkType); if (a.unknown) acc.unknown.push(a.name); }
  const w = WAVATAR_BY_NAME.get(gear.wavatar); if (w) addStats(acc, w.stats, atkType);
  const o = OUTFIT_BY_NAME.get(gear.outfit); if (o) addStats(acc, o.stats, atkType);
  for (const [piece, set] of Object.entries(gear.armor)) {
    if (ARMOR_AVATARS[set]) addStats(acc, ARMOR_AVATARS[set][piece], atkType);
    else if (set) acc.unknown.push(`${set} (레어 아바타)`);
  }
  if (gear.spirit != null && SPIRIT_FX[gear.spirit]) addStats(acc, SPIRIT_FX[gear.spirit], atkType);
  addEquip(acc, gear.equip, atkType);

  // 세트 효과. 무악 세트는 AVATAR_SET_LIMIT 개까지만
  const all = setStages(countSets(gear), ignore);
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
  // 버프 세팅의 얼상·귀걸이 크뎀 곱연산(item_cd_mults)은 빼고 장비 쪽 효과(fx.cdMults)로 센다 (같은 아이템을 두 번 세지 않게)
  const s = resolve(win, job, resist, Object.assign({}, setup, { cd_base_mults: setup.cd_base_mults.concat(fx.cdMults), item_cd_mults: [] }));
  return dpsIndex(s) * prodOf(fx.finals) * (1 + (setup.town_final || 0));   // 마을 버프의 최종 데미지 (있는 버프만)
}

/**
 * 크리·극대 소켓 기준 (ctx.sockets): 장비로 크리·극대가 바뀌면, 그 스탯의 마법석(6%)을 다른 마법석과 한 칸씩 바꿔 보고
 *   - DPS가 오르면: 바뀐 크리·극대와 그 소켓 교체까지 반영한 값으로 센다
 *   - 안 오르면: 그 크리·극대 변화는 없는 것으로 센다 (소켓이 6% 단위라 작은 변화는 실제로 다른 스탯으로 바꿀 수 없다고 본다)
 * 크리·극대가 늘었으면 그 마법석을 빼 보고, 줄었으면 더 끼워 본다. 좋아지는 동안 세 칸까지.
 * 지금 소켓은 크극 최적화로 맞춰 둔 상태(바꿔도 이득이 없는 상태)라고 가정한다.
 * sockets.partners: 크리·극대 대신 끼우는 마법석 [{ name, stats: { boss: 0.025 } }, ...]
 * 반환: { real: 소켓 교체까지 한 스탯창, value: 계산에 쓰는 DPS 지수, swaps: [{ k, dir, name }], dropped: [없는 것으로 센 스탯] }
 */
function settleSockets(win, exactWin, delta, dpsOf, sockets) {
  if (!(Math.abs(delta.crit || 0) >= 1e-9 && has(win, "crit")) && !(Math.abs(delta.maxi || 0) >= 1e-9 && has(win, "maxi")))
    return { real: exactWin, value: dpsOf(exactWin), swaps: [], dropped: [] };
  let cur = exactWin, v = dpsOf(cur);
  const swaps = [], dropped = [];
  for (const k of ["crit", "maxi"]) {
    const dk = delta[k] || 0;
    if (Math.abs(dk) < 1e-9 || !has(cur, k)) continue;
    const dir = dk > 0 ? -1 : 1;
    let n = 0;
    for (let i = 0; i < 3; i++) {
      let best = null;
      for (const p of dir < 0 ? sockets.add : sockets.remove) {
        if (!Object.keys(p.stats).every(s => has(cur, s))) continue;
        const d = { [k]: dir * CRIT_MAXI_PER_SLOT };
        for (const [s, x] of Object.entries(p.stats)) d[s] = (d[s] || 0) - dir * x;
        const w = shiftWindow(cur, d).win, x = dpsOf(w);
        if (x > v * (1 + 1e-12) && (!best || x > best.v)) best = { w, v: x, p };
      }
      if (!best) break;
      cur = best.w; v = best.v; n++; swaps.push({ k, dir, name: best.p.name });
    }
    if (!n) dropped.push(k);
  }
  if (!dropped.length) return { real: cur, value: v, swaps, dropped };
  const calc = Object.assign({}, cur);
  for (const k of dropped) calc[k] = win[k];   // 쓰지 못한 크리·극대 변화는 지금 값으로 되돌려 계산
  return { real: cur, value: dpsOf(calc), swaps, dropped };
}

/** 무악 세트가 4개 이상이면, 켤 수 있는 조합 중 score(세트 이름 목록)가 가장 높은 것. 3개 이하면 null */
function bestAvatarChoice(gear, score, ignore) {
  const names = setStages(countSets(gear), ignore).filter(s => s.kind === "avatar").map(s => s.name);
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
 * 지금 장착(before)을 기준으로 다른 장착을 평가하는 함수들 (교체 비교와 자동 찾기가 같이 쓴다).
 * 반환: {
 *   before,
 *   evaluate(afterGear) -> { fx, shifted, value: 지금 대비 DPS 배율 }
 *   valueOf(fx, g)      -> 효과 묶음 { visible, cdMults, finals } 의 지금 대비 DPS 배율 (자동 찾기가 스탯별 가치를 잴 때 쓴다. g 는 마을 버프용)
 * }
 * 지금 장착은 ctx.setup 의 마을 버프로, 바꾼 장착은 g.town 이 있으면 그 마을 버프로 계산한다.
 * opts.ignoreSets: 세트 효과를 세지 않을 세트 (자동 찾기 전용)
 */
export function gearScorer(ctx, beforeGear, { ignoreSets = null } = {}) {
  const { win, job, resist, setup } = ctx, atkType = job ? job.type : "물리";
  const setupFor = g => g && g.town && g.town !== ctx.town ? setupWithTown(setup, g.town) : setup;
  const battle = setup.glitter_battle ?? null;
  const before = gearEffects(beforeGear, atkType, beforeGear.avatarSets, ignoreSets, battle);
  const baseDps = dps(win, job, resist, setup, before);
  // 크리·극대 소켓 기준: 대신 끼울 마법석은 지금 상태에서 한 칸 끼웠을 때 가장 좋은 것, 뺄 마법석은 한 칸 뺐을 때 손해가 가장 적은 것 하나씩
  // (칸마다 다시 고르면 자동 찾기가 몇 배 느려진다. 순서가 바뀌는 경우는 드물다)
  let sockets = null;
  if (ctx.sockets && ctx.sockets.partners) {
    const ok = ctx.sockets.partners.filter(p => Object.keys(p.stats).every(s => has(win, s)));
    const at = (p, sign) => { const d = {}; for (const [s, x] of Object.entries(p.stats)) d[s] = sign * x; return dps(shiftWindow(win, d).win, job, resist, setup, before); };
    if (ok.length) sockets = {
      add: [ok.reduce((a, p) => at(p, 1) > at(a, 1) ? p : a)],
      remove: [ok.reduce((a, p) => at(p, -1) > at(a, -1) ? p : a)],
    };
  }
  /** 효과 묶음 -> 바뀐 스탯창(shifted: 장비만, real: 소켓 교체까지)과 DPS 지수. exact 면 소켓 기준을 쓰지 않는다 */
  const settle = (fx, st0, exact) => {
    const st = withPartEnhance(st0, fx, before);   // 방어구 하의·신발 강화가 바뀌었으면 크리·극대 곱연산도
    const delta = minus(fx.visible, before.visible), shifted = shiftWindow(win, delta);
    const dpsOf = w => dps(w, job, resist, st, fx);
    if (!sockets || exact) return { shifted, real: shifted.win, value: dpsOf(shifted.win), swaps: [], dropped: [], setup: st };
    return Object.assign({ shifted, setup: st }, settleSockets(win, shifted.win, delta, dpsOf, sockets));
  };
  const valueOf = (fx, g) => settle(fx, setupFor(g)).value / baseDps;
  const afterFor = (g, choice, exact) => {
    const fx = gearEffects(g, atkType, choice, ignoreSets, battle), r = settle(fx, setupFor(g), exact);
    return { fx, shifted: r.shifted, real: r.real, swaps: r.swaps, dropped: r.dropped, setup: r.setup, value: r.value / baseDps };
  };
  // 바꾼 쪽은 사용자가 고르지 않았으면 가장 좋은 무악 세트 조합을 고른다 (켤 세트는 소켓 기준 없이 정확한 값으로 고른다)
  const evaluate = g => afterFor(g, g.avatarSets || bestAvatarChoice(g, names => afterFor(g, names, true).value, ignoreSets));
  /** 효과 묶음을 반영한 스탯창(소켓 교체까지)과 버프 (자동 찾기가 상한 초과를 잴 때 쓴다) */
  const windowOf = (fx, g) => { const r = settle(fx, setupFor(g)); return { win: r.real, setup: r.setup }; };
  return { before, evaluate, valueOf, windowOf };
}

/**
 * 지금 장착(before)과 바꾼 장착(after) 비교.
 * ctx: { win, job, resist, setup } (화면의 스탯창 값과 버프 세팅)
 * 반환: { gain, before, after, delta: 보이는 효과 변화, blank: 스탯창이 비어 반영 못 한 효과, win: 바꾼 뒤 스탯창 }
 */
export function compareGear(ctx, beforeGear, afterGear) {
  const { before, evaluate } = gearScorer(ctx, beforeGear);
  const after = evaluate(afterGear);
  return {
    gain: after.value - 1,
    before, after: after.fx,
    delta: minus(after.fx.visible, before.visible),
    hidden: { cd: [before.cdMults, after.fx.cdMults], final: [before.finals, after.fx.finals] },
    ignored: minus(after.fx.ignored, before.ignored),
    blank: after.shifted.blank,
    win: after.shifted.win,   // 바꾼 뒤 스탯창 (장비만. 크리·극대 소켓 기준이면 swaps 의 소켓 교체는 따로)
    swaps: after.swaps, dropped: after.dropped,
    real: after.real,         // 소켓 교체까지 한 스탯창 (크리·극대 소켓 기준을 켰을 때)
    setup: after.setup,       // 바꾼 뒤 버프 (마을 버프를 바꿨으면 그 버프)
  };
}
