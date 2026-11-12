// 악세·아바타 자동 찾기: 지금 세팅을 기준으로 DPS가 가장 높아지는 조합을 찾는다.
//
// 칸마다 고를 수 있는 것을 모두 곱하면 10^20 가지가 넘어서 전부 따져 볼 수는 없다.
// 대신 "어떤 세트를 몇 세트까지 맞출지(세트 계획)"를 기준으로 나눠서 찾는다.
//
//   1) 스탯별 가치 재기: 지금 상태에서 크리 1%, 보뎀 1% … 가 DPS를 몇 % 올리는지 잰다 (점감·상한이 반영된 값)
//   2) 세트 계획 훑기: 아바타 악세 쪽은 무악 세트 최대 3개, 일반 악세 쪽은 레이드 세트와 아트마(속성별)의
//      모든 조합을 만든다 (아바타 쪽 약 1만 7천 가지). 계획마다 세트 아이템을 어느 칸에 끼울지 정하고,
//      남은 칸은 그 칸에서 혼자 가장 좋은 아이템으로 채운다. 이 단계는 1)의 가치로 빠르게 어림한다
//   3) 어림값이 좋은 계획 몇십 개만 실제 계산기로 정확히 계산해서 가장 좋은 것을 고른다
//   4) 아바타 쪽 -> 일반 악세 쪽 -> 한 벌·5셋 순서로 되풀이한다 (한쪽이 바뀌면 스탯 가치가 바뀌므로)
//   5) 마지막으로 칸 하나 바꾸기·세트 채우기를 정확한 계산으로 더 좋아지지 않을 때까지 해 본다 (다듬기)
//
// 가정
//   - 고정하지 않은 칸은 게임에 있는 어떤 아이템이든 낄 수 있다고 본다
//   - 고정하지 않은 아트마 악세는 유니크로 본다 (만다라는 등급이 이름에 있어서 그중 가장 좋은 것을 고른다)
//   - 같은 반지 두 개는 끼지 않는다
//   - 수치를 모르는 아이템과 능력치도 세트도 없는 아이템은 고르지 않는다 (고정한 칸에 있으면 그대로 둔다)
//   - 무기 종류는 바꾸지 않는다

import { ACCESSORIES, ACC_SLOTS, WEAPON_AVATARS, OUTFITS, ARMOR_AVATARS, SETS, ATMA, AVATAR_SET_LIMIT } from "../data/accessories.js";
import { gearScorer, countSets, IGNORED } from "./gear.js";

const ARMOR_PIECES = ["hair", "top", "bottom", "gloves", "shoes"];
const ATMA_GRADED = ATMA.pieces.filter(s => s !== "top");
const BEST_ATMA_GRADE = ATMA.maxGrade;
const ATMA_ELEMENTS = Object.keys(ATMA.sets).map(n => n.replace(/의 아트마$/, ""));
const ATMA_NAMES = new Set(ACCESSORIES.filter(a => a.atma).map(a => a.name));

/** 고정할 수 있는 칸의 이름: "avatar.weapon", "normal.ring2", "outfit", "wavatar", "armor"(5셋), "element"(아트마 속성) */
export const LOCKABLE = [
  ...["avatar", "normal"].flatMap(layer => ACC_SLOTS.map(s => `${layer}.${s.key}`).concat(layer === "normal" ? ["normal.ring2"] : [])),
  "outfit", "wavatar", "armor", "element",
];

// ----- 후보 줄이기: 다른 후보보다 모든 면에서 나을 게 없는 아이템은 뺀다 -----

/** 계산에 쓰는 효과만, 물리/마법 공격력 %는 직업에 맞는 쪽만 남긴 능력치 */
function counted(stats, atkType) {
  const out = {};
  for (const [k, v] of Object.entries(stats || {})) {
    if (k === "patk" || k === "matk" || IGNORED[k]) continue;
    if (k === "patk_pct" || k === "matk_pct") { if ((k === "patk_pct") === (atkType !== "마법")) out.atk_pct = (out.atk_pct || 0) + v; continue; }
    out[k] = (out[k] || 0) + v;
  }
  return out;
}

const gradeRank = name => { const m = name.match(/\((레전드리|유니크|엘리트|레어|일반),/); return m ? ATMA.grades.indexOf(m[1]) : ATMA.grades.indexOf(BEST_ATMA_GRADE); };

/** a 가 b 보다 모든 면에서 같거나 나은지. 세트·아트마 여부가 다르면 비교하지 않는다 (세트 효과는 따로 따져야 해서) */
function dominates(a, b) {
  if (a.set !== b.set || a.atma !== b.atma) return false;
  if (a.atma && gradeRank(a.name) > gradeRank(b.name)) return false;
  for (const k of new Set([...Object.keys(a.c), ...Object.keys(b.c)])) if ((a.c[k] || 0) < (b.c[k] || 0) - 1e-12) return false;
  return true;
}

/** 직업에 맞는 이름(물공·마공, 물반·마반)을 앞에 둬서, 효과가 같으면 그쪽이 남게 한다 */
const typeFirst = (atkType, list) => {
  const mine = atkType === "마법" ? /\(마/ : /\(물/, other = atkType === "마법" ? /\(물/ : /\(마/;
  return list.filter(x => mine.test(x.name)).concat(list.filter(x => !mine.test(x.name) && !other.test(x.name)), list.filter(x => other.test(x.name)));
};

const prune = list => list.filter((b, i) => !list.some((a, j) => j !== i && dominates(a, b) && (!dominates(b, a) || j < i)));

// ----- 칸 (변수) -----
// group: "avatar" (아바타 악세 + 무기 아바타) | "normal" (일반 악세) | "wear" (한 벌, 5셋) | "element" (아트마 속성)

function variables(atkType) {
  const vars = [];
  for (const layer of ["avatar", "normal"]) {
    for (const key of ACC_SLOTS.map(s => s.key).concat(layer === "normal" ? ["ring2"] : [])) {
      const slot = key === "ring2" ? "ring" : key;
      const items = ACCESSORIES.filter(a => a.layer === layer && a.slot === slot && !a.unknown && (Object.keys(a.stats).length || a.atma || a.set !== "없음"))
        .map(a => ({ name: a.name, set: a.set, atma: !!a.atma, c: counted(a.stats, atkType) }));
      const cands = prune(typeFirst(atkType, items));
      vars.push({ key: `${layer}.${key}`, group: layer, layer, slot: key, cands, values: cands.map(x => x.name), get: g => g[layer][key] || null, set: (g, v) => { g[layer][key] = v; } });
    }
  }
  const wav = WEAPON_AVATARS.map(w => ({ name: w.name, set: w.set, atma: false, c: counted(w.stats, atkType) }));
  vars.push({ key: "wavatar", group: "avatar", cands: wav, values: wav.map(w => w.name), get: g => g.wavatar || null, set: (g, v) => { g.wavatar = v; } });
  const outfits = prune(OUTFITS.map(o => ({ name: o.name, set: "없음", atma: false, c: counted(o.stats, atkType) })));
  vars.push({ key: "outfit", group: "wear", cands: outfits, values: outfits.map(o => o.name), get: g => g.outfit || null, set: (g, v) => { g.outfit = v; } });
  vars.push({ key: "armor", group: "wear", values: Object.keys(ARMOR_AVATARS), get: g => g.armor.hair || null, set: (g, v) => { for (const p of ARMOR_PIECES) g.armor[p] = v; } });
  vars.push({ key: "element", group: "element", values: ATMA_ELEMENTS, get: g => g.atma.element, set: (g, v) => { g.atma.element = v; } });
  return vars;
}

// ----- 장착 상태 다루기 -----

const clone = g => ({
  avatar: { ...g.avatar }, normal: { ...g.normal }, outfit: g.outfit || null, wavatar: g.wavatar || null, weapon: g.weapon || null,
  armor: { ...g.armor }, atma: { element: g.atma.element, grades: { ...g.atma.grades } }, avatarSets: null,
});
const validRings = g => !g.normal.ring || g.normal.ring !== g.normal.ring2;
const setOf = name => { const a = ACCESSORIES.find(x => x.name === name) || WEAPON_AVATARS.find(x => x.name === name); return a && !a.atma && a.set !== "없음" ? a.set : null; };
const SET_OF = new Map([...ACCESSORIES, ...WEAPON_AVATARS].map(a => [a.name, setOf(a.name)]).filter(x => x[1]));

/** 같은 시드면 같은 수열 (mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ----- 세트 계획 훑기 -----

/** 배열에서 n개를 고르는 모든 경우 */
function combos(arr, n) {
  const out = [];
  const go = (start, picked) => {
    if (picked.length === n) { out.push(picked.slice()); return; }
    for (let i = start; i <= arr.length - (n - picked.length); i++) { picked.push(arr[i]); go(i + 1, picked); picked.pop(); }
  };
  go(0, []);
  return out;
}

/**
 * 칸 묶음 안에서 가장 좋은 세트 계획들을 어림값 순으로 돌려준다.
 * slots : [{ free: 혼자 가장 좋은 아이템의 어림값 }]
 * groups: [{ id, pieces: [[칸 번호, 아이템 이름, 어림값]...], options: [{ need: 끼워야 할 개수, bonus: 세트 효과 어림값, tag }] }]
 * limit : 동시에 고를 수 있는 세트 수,  keep: 돌려줄 계획 수
 * 반환  : { list: [{ value, picks: [[칸 번호, 아이템 이름]...], tags: [...] }], total: 어림해 본 계획 수 }
 */
function bestPlans(slots, groups, limit, keep) {
  const freeSum = slots.reduce((a, s) => a + s.free, 0);
  // 세트·끼울 개수별로, 칸 고르기를 이득 순으로 정리해 둔다 (이득 = 세트 아이템 값 - 그 칸의 혼자 가장 좋은 값)
  const subsetCache = new Map();
  const subsets = (gi, need) => {
    const key = gi + ":" + need;
    if (!subsetCache.has(key)) {
      const g = groups[gi];
      const list = combos(g.pieces, need).map(ps => {
        let mask = 0, gain = 0;
        for (const [i, , v] of ps) { if (mask & (1 << i)) return null; mask |= 1 << i; gain += v - slots[i].free; }
        return { mask, gain, picks: ps.map(([i, name]) => [i, name]) };
      }).filter(Boolean).sort((a, b) => b.gain - a.gain);
      subsetCache.set(key, list);
    }
    return subsetCache.get(key);
  };

  /** 고른 세트들(+끼울 개수)에 대해 칸이 겹치지 않게 이득이 가장 큰 배치 */
  function assign(chosen) {
    const lists = chosen.map(([gi, opt]) => subsets(gi, opt.need));
    if (lists.some(l => !l.length)) return null;
    const tops = lists.map(l => l[0].gain), rest = tops.map((_, i) => tops.slice(i + 1).reduce((a, x) => a + x, 0));
    let best = null;
    const go = (i, used, gain, picks) => {
      if (i === lists.length) { if (!best || gain > best.gain) best = { gain, picks: picks.slice() }; return; }
      for (const s of lists[i]) {
        if (best && gain + s.gain + rest[i] <= best.gain) break;   // 이득 순이라 뒤는 더 볼 필요 없다
        if (used & s.mask) continue;
        go(i + 1, used | s.mask, gain + s.gain, picks.concat(s.picks));
      }
    };
    go(0, 0, 0, []);
    return best;
  }

  const plans = [{ value: freeSum, picks: [], tags: [] }];
  const walk = (start, chosen, bonus) => {
    if (chosen.length) {
      const a = assign(chosen);
      if (a) plans.push({ value: freeSum + a.gain + bonus, picks: a.picks, tags: chosen.map(([, o]) => o.tag) });
    }
    if (chosen.length === limit) return;
    for (let gi = start; gi < groups.length; gi++) {
      for (const opt of groups[gi].options) { chosen.push([gi, opt]); walk(gi + 1, chosen, bonus + opt.bonus); chosen.pop(); }
    }
  };
  walk(0, [], 0);
  return { list: plans.sort((a, b) => b.value - a.value).slice(0, keep), total: plans.length };
}

/**
 * 자동 찾기.
 * ctx    : { win, job, resist, setup } (compareGear 와 같다)
 * now    : 지금 장착 상태 (gear.js 의 모양)
 * opts   : { locked: 고정할 칸 이름 목록 (LOCKABLE 참고), plans: 정확히 계산해 볼 계획 수, rounds: 마지막에 무작위로 흔들어 볼 횟수, kicks: 한 번에 흔드는 최대 개수, seed }
 * 반환   : { gear: 찾은 장착 상태, gain: 지금 대비 DPS 변화, evals: 정확히 계산한 조합 수, plans: 어림해 본 세트 계획 수 }
 */
export function optimizeGear(ctx, now, { locked = [], plans: keep = 30, rounds = 4, kicks = 1, seed = 1 } = {}) {
  const atkType = ctx.job ? ctx.job.type : "물리";
  const scorer = gearScorer(ctx, now);
  let evals = 0, planCount = 0;
  const value = g => { evals++; return scorer.evaluate(g).value; };
  const lock = new Set(locked);
  const all = variables(atkType), vars = all.filter(v => !lock.has(v.key));
  const byKey = new Map(all.map(v => [v.key, v]));
  const elementVar = vars.find(v => v.key === "element");

  /** 바꾸기 하나: [[칸, 값], ...]. 고정하지 않은 아트마 칸에 아트마 악세를 넣으면 등급을 유니크로 본다 */
  const apply = (g, changes) => {
    const n = clone(g);
    for (const [v, x] of changes) {
      v.set(n, x);
      if (v.layer === "normal" && ATMA_GRADED.includes(v.slot)) n.atma.grades[v.slot] = BEST_ATMA_GRADE;
    }
    return n;
  };

  // ----- 1) 스탯별 가치: 지금 상태에서 그 스탯이 1%p 늘면 DPS가 몇 % 느는지 (점감·상한 반영) -----
  const KEYS = ["crit", "maxi", "crit_dmg", "atk_pct", "boss", "polar", "all_skill", "cho", "gang", "hp_over", "hp_under", "hp100", "add", "adapt", "cdr_all", "cd_mult", "final"];
  function weights(g) {
    const fx = scorer.evaluate(g).fx, v0 = scorer.valueOf(fx), d = 0.01, w = {};
    for (const k of KEYS) {
      const fx1 = k === "cd_mult" ? { visible: fx.visible, cdMults: fx.cdMults.concat([d]), finals: fx.finals }
        : k === "final" ? { visible: fx.visible, cdMults: fx.cdMults, finals: fx.finals.concat([d]) }
        : { visible: { ...fx.visible, [k]: (fx.visible[k] || 0) + d }, cdMults: fx.cdMults, finals: fx.finals };
      w[k] = (scorer.valueOf(fx1) / v0 - 1) / d;
    }
    return w;
  }
  const lin = (c, w) => { let s = 0; for (const k in c) s += c[k] * (w[k] || 0); return s; };
  const stageValue = (name, k, w) => Object.entries(SETS[name].stages).filter(([n]) => +n <= k).reduce((a, [, st]) => a + lin(counted(st, atkType), w), 0);

  /** 칸 묶음의 "혼자 가장 좋은 아이템" (반지 두 칸은 서로 다른 것) */
  function freeBest(slotVars, w, g) {
    const out = slotVars.map(v => {
      const list = v.cands.filter(c => !c.atma).map(c => [c.name, lin(c.c, w)]).sort((a, b) => b[1] - a[1]);
      return { v, list, free: list.length ? Math.max(0, list[0][1]) : 0, name: list.length && list[0][1] > 0 ? list[0][0] : null };
    });
    const r1 = out.find(s => s.v.key === "normal.ring"), r2 = out.find(s => s.v.key === "normal.ring2");
    const other = r1 ? null : g.normal.ring;   // 반지 1이 고정이면 그 반지와 다른 것
    if (r2) {
      const taken = r1 ? r1.name : other;
      const alt = r2.list.find(([n, val]) => n !== taken && val > 0);
      r2.name = alt ? alt[0] : null; r2.free = alt ? alt[1] : 0;
    }
    return out;
  }

  /** 계획을 실제 장착 상태로 만든다 */
  function realize(g, slotInfo, plan, extra) {
    const n = clone(g), placed = new Map(plan.picks.map(([i, name]) => [i, name]));
    slotInfo.forEach((s, i) => s.v.set(n, placed.has(i) ? placed.get(i) : s.name));
    for (const s of slotInfo) if (s.v.layer === "normal" && ATMA_GRADED.includes(s.v.slot)) n.atma.grades[s.v.slot] = BEST_ATMA_GRADE;
    if (extra) extra(n, plan);
    // 반지 두 칸이 같아지면 반지 2를 다음으로 좋은 것으로
    if (!validRings(n)) { const r2 = slotInfo.find(s => s.v.key === "normal.ring2"); if (r2) r2.v.set(n, (r2.list.find(([x]) => x !== n.normal.ring) || [null])[0]); }
    return n;
  }

  /** 이 묶음에서 고정한 칸(과 무기 종류)이 세트 개수에 더해 주는 몫 */
  function lockedCount(g, layerVars, name) {
    const fixed = clone(g);
    for (const v of layerVars) v.set(fixed, null);
    return countSets(fixed).get(name) || 0;
  }

  // ----- 2)·3) 아바타 쪽: 무악 세트 최대 3개 -----
  function avatarStep(g, cur) {
    const layerVars = vars.filter(v => v.group === "avatar");
    if (!layerVars.length) return { g, v: cur };
    const w = weights(g), slots = freeBest(layerVars, w, g);
    const groups = [];
    for (const [name, s] of Object.entries(SETS)) {
      if (s.kind !== "avatar") continue;
      const pieces = [];
      slots.forEach((sl, i) => {
        const best = sl.v.cands.filter(c => c.set === name).map(c => [c.name, lin(c.c, w)]).sort((a, b) => b[1] - a[1])[0];
        if (best) pieces.push([i, best[0], best[1]]);
      });
      const have = lockedCount(g, layerVars, name);
      const options = Object.keys(s.stages).map(Number).map(k => ({ need: k - have, bonus: stageValue(name, k, w), tag: name }))
        .filter(o => o.need >= 1 && o.need <= pieces.length);
      if (options.length) groups.push({ id: name, pieces, options });
    }
    const { list, total } = bestPlans(slots, groups, AVATAR_SET_LIMIT, keep);
    planCount += total;
    // 다듬을 때 한 벌·5셋도 같이 다시 고른다 (크리·극대 균형이 아바타 악세와 맞물려 있어서)
    return bestRealized(g, cur, list.map(p => realize(g, slots, p)), layerVars.concat(vars.filter(v => v.group === "wear")));
  }

  // ----- 2)·3) 일반 악세 쪽: 레이드 세트 + 아트마(속성별) -----
  function normalStep(g, cur) {
    const layerVars = vars.filter(v => v.group === "normal");
    if (!layerVars.length) return { g, v: cur };
    const w = weights(g), slots = freeBest(layerVars, w, g);
    const groups = [];
    for (const [name, s] of Object.entries(SETS)) {
      if (s.kind !== "other") continue;
      const pieces = [];
      slots.forEach((sl, i) => {
        const best = sl.v.cands.filter(c => c.set === name).map(c => [c.name, lin(c.c, w)]).sort((a, b) => b[1] - a[1])[0];
        if (best) pieces.push([i, best[0], best[1]]);
      });
      const have = lockedCount(g, layerVars, name);
      const options = Object.keys(s.stages).map(Number).map(k => ({ need: k - have, bonus: stageValue(name, k, w), tag: name }))
        .filter(o => o.need >= 1 && o.need <= pieces.length);
      if (options.length) groups.push({ id: name, pieces, options });
    }
    // 아트마: 4개부터 켜진다. 속성마다 효과가 달라서 속성별로 따로 둔다
    const atmaPieces = [];
    slots.forEach((sl, i) => {
      const best = sl.v.cands.filter(c => c.atma).map(c => [c.name, lin(c.c, w)]).sort((a, b) => b[1] - a[1])[0];
      if (best) atmaPieces.push([i, best[0], best[1]]);
    });
    const fixedAtma = ATMA.pieces.filter(s => !slots.some(sl => sl.v.slot === s) && ATMA_NAMES.has(g.normal[s])).length;
    const elements = elementVar ? ATMA_ELEMENTS : [g.atma.element];
    const atmaOptions = [];
    for (const el of elements) {
      const eff = ATMA.sets[`${el}의 아트마`];
      if (!eff) continue;
      const bonus = lin({ final: eff.final ? eff.final[BEST_ATMA_GRADE] : 0, cd_mult: eff.cd_mult ? eff.cd_mult[BEST_ATMA_GRADE] : 0 }, w) + lin(counted(eff.fixed, atkType), w);
      for (const k of [ATMA.need, ATMA.pieces.length]) {
        const need = k - fixedAtma;
        if (need >= 1 && need <= atmaPieces.length) atmaOptions.push({ need, bonus, tag: "atma:" + el });
      }
    }
    if (atmaOptions.length) groups.push({ id: "atma", pieces: atmaPieces, options: atmaOptions });
    const { list, total } = bestPlans(slots, groups, groups.length, keep);
    planCount += total;
    const setElement = (n, plan) => { const t = plan.tags.find(x => x.startsWith("atma:")); if (t && elementVar) n.atma.element = t.slice(5); };
    return bestRealized(g, cur, list.map(p => realize(g, slots, p, setElement)), layerVars);
  }

  // ----- 한 벌·5셋: 하나씩 모두 계산해 본다 -----
  function wearStep(g, cur) {
    for (const v of vars.filter(x => x.group === "wear")) {
      const r = pickBest(g, cur, v.values.filter(x => x !== v.get(g)).map(x => apply(g, [[v, x]])));
      g = r.g; cur = r.v;
    }
    return { g, v: cur };
  }

  /**
   * 계획으로 만든 장착 상태들을 정확히 계산하고, 위쪽 몇 개는 칸을 하나씩 다시 골라(좋아질 때만 바꾼다) 다듬은 뒤 가장 좋은 것.
   * (남은 칸은 어림값으로 채웠기 때문에, 정확히 계산하면 다른 아이템이 더 나을 수 있다)
   */
  function bestRealized(g, cur, candidates, layerVars, top = 5) {
    const scored = candidates.filter(validRings).map(n => ({ g: n, v: value(n) })).sort((a, b) => b.v - a.v).slice(0, top);
    let best = { g, v: cur };
    for (let { g: n, v } of scored) {
      for (let pass = 0; pass < 2; pass++) {
        const start = v;
        for (const x of layerVars) {
          const was = x.get(n);
          for (const y of x.values) {
            if (y === was) continue;
            const m = apply(n, [[x, y]]);
            if (!validRings(m)) continue;
            const mv = value(m);
            if (mv > v + 1e-12) { n = m; v = mv; }
          }
        }
        if (v <= start + 1e-12) break;
      }
      if (v > best.v + 1e-12) best = { g: n, v };
    }
    return best;
  }

  function pickBest(g, cur, candidates) {
    let best = { g, v: cur };
    for (const n of candidates) {
      if (!validRings(n)) continue;
      const v = value(n);
      if (v > best.v + 1e-12) best = { g: n, v };
    }
    return best;
  }

  // ----- 5) 다듬기: 정확한 계산으로 언덕 오르기 -----
  const setSlots = new Map();   // 세트 -> [[칸, [아이템...]]]
  for (const v of vars) {
    const bySet = new Map();
    for (const c of v.cands || []) if (SET_OF.has(c.name)) bySet.set(SET_OF.get(c.name), (bySet.get(SET_OF.get(c.name)) || []).concat([c.name]));
    for (const [set, names] of bySet) setSlots.set(set, (setSlots.get(set) || []).concat([[v, names]]));
  }
  const setNames = [...setSlots.keys()].filter(n => SETS[n] && SETS[n].kind !== "armor");
  const atmaVars = vars.filter(v => v.layer === "normal" && ATMA.pieces.includes(v.slot) && v.cands.some(c => c.atma));

  /**
   * 한 바퀴마다 칸 하나 바꾸기를 모두 따져 보고, 세트마다 다음 단계까지 모자란 개수만큼
   * (혼자 바꿨을 때 손해가 가장 적은 칸에) 그 세트를 끼워 보고, 아트마도 같은 방법으로 (속성마다) 끼워 본 뒤
   * 가장 좋아지는 것으로 바꾼다. 더 좋아지는 게 없으면 멈춘다.
   */
  function climb(g, cur) {
    for (;;) {
      let best = null;
      const consider = changes => {
        const n = apply(g, changes);
        if (!validRings(n)) return -Infinity;
        const v = value(n);
        if (v > cur + 1e-12 && (!best || v > best.v)) best = { g: n, v };
        return v;
      };
      const single = new Map();
      for (const v of vars) {
        const was = v.get(g);
        for (const x of v.values) if (x !== was) single.set(v.key + "|" + x, consider([[v, x]]));
      }
      const pickPiece = (v, names) => names.map(x => [v, x, single.get(v.key + "|" + x)]).sort((a, b) => b[2] - a[2])[0];
      const counts = countSets(g);
      for (const name of setNames) {
        const pieces = setSlots.get(name).filter(([v]) => SET_OF.get(v.get(g)) !== name).map(([v, names]) => pickPiece(v, names)).sort((a, b) => b[2] - a[2]);
        const have = counts.get(name) || 0;
        for (const k of Object.keys(SETS[name].stages).map(Number)) {
          const need = k - have;
          if (need >= 2 && need <= pieces.length) consider(pieces.slice(0, need).map(([v, x]) => [v, x]));
        }
      }
      // 세트 아이템 옮기기: 세트 아이템이 낀 칸 A를 그 칸에서 혼자 가장 좋은 다른 아이템으로 바꾸고, 대신 빈 칸 B에 그 세트를 낀다
      const bestOther = (v, isPiece) => v.values.filter(x => !isPiece(x)).map(x => [x, single.get(v.key + "|" + x)]).sort((a, b) => b[1] - a[1])[0];
      const relocate = (slotsWith, isPiece, piecesFor) => {
        const holders = slotsWith.filter(v => isPiece(v.get(g)));
        const targets = slotsWith.filter(v => !isPiece(v.get(g)));
        for (const a of holders) {
          const out = bestOther(a, isPiece);
          if (!out) continue;
          for (const b of targets) { const p = piecesFor(b); if (p) consider([[a, out[0]], [b, p]]); }
        }
      };
      for (const name of setNames) {
        if (!counts.get(name)) continue;
        const slotsWith = setSlots.get(name).map(([v]) => v);
        relocate(slotsWith, x => SET_OF.get(x) === name, b => { const e = setSlots.get(name).find(([v]) => v === b); const p = e && pickPiece(b, e[1]); return p && p[1]; });
      }
      if (atmaVars.length) relocate(atmaVars, x => ATMA_NAMES.has(x), b => (pickPiece(b, b.cands.filter(c => c.atma).map(c => c.name)) || [])[1]);

      if (atmaVars.length) {
        const have = ATMA.pieces.filter(s => ATMA_NAMES.has(g.normal[s])).length;
        const pieces = atmaVars.filter(v => !ATMA_NAMES.has(v.get(g))).map(v => pickPiece(v, v.cands.filter(c => c.atma).map(c => c.name))).sort((a, b) => b[2] - a[2]);
        for (const k of [ATMA.need, ATMA.pieces.length]) {
          const need = k - have;
          if (need < 1 || need > pieces.length) continue;
          const base = pieces.slice(0, need).map(([v, x]) => [v, x]);
          for (const el of elementVar ? elementVar.values : [null]) {
            if (need === 1 && (!el || el === g.atma.element)) continue;   // 칸 하나 바꾸기와 같다
            consider(el ? base.concat([[elementVar, el]]) : base);
          }
        }
      }
      if (!best) return { g, v: cur };
      g = best.g; cur = best.v;
    }
  }

  // ----- 순서대로 -----
  let g = clone(now);
  for (const slot of ATMA_GRADED) if (!lock.has(`normal.${slot}`)) g.atma.grades[slot] = BEST_ATMA_GRADE;
  if (!validRings(g) && byKey.get("normal.ring2") && !lock.has("normal.ring2")) g.normal.ring2 = null;
  let cur = value(g);
  for (let i = 0; i < 4; i++) {
    const before = cur;
    for (const step of [avatarStep, normalStep, wearStep]) ({ g, v: cur } = step(g, cur));
    if (cur <= before + 1e-9) break;
  }
  ({ g, v: cur } = climb(g, cur));

  // 흔들어 보기: 세트(또는 아트마 속성 하나)를 1~kicks개 통째로 끼우고 다시 다듬어 본다. 더 좋으면 옮긴다
  const kickMoves = setNames.map(name => setSlots.get(name).map(([v, names]) => [v, names[0]]));
  if (atmaVars.length) for (const el of elementVar ? elementVar.values : [null]) {
    const m = atmaVars.map(v => [v, v.cands.find(c => c.atma).name]);
    kickMoves.push(el ? m.concat([[elementVar, el]]) : m);
  }
  const rand = rng(seed);
  for (let i = 0; i < rounds && kickMoves.length; i++) {
    let n = g;
    const times = 1 + Math.floor(rand() * kicks);
    for (let k = 0; k < times; k++) n = apply(n, kickMoves[Math.floor(rand() * kickMoves.length)]);
    if (!validRings(n)) continue;
    const r = climb(n, value(n));
    if (r.v > cur + 1e-12) ({ g, v: cur } = r);
  }
  return { gear: g, gain: cur - 1, evals, plans: planCount };
}
