import { test } from "node:test";
import assert from "node:assert/strict";
import { ACC_SLOTS, ACC_LAYERS, ACCESSORIES, WEAPON_AVATARS, ARMOR_AVATARS, OUTFITS, SETS, ATMA } from "../js/data/accessories.js";

const KEYS = new Set(["crit", "maxi", "crit_dmg", "patk_pct", "matk_pct", "boss", "polar", "all_skill", "cho", "gang", "hp_over", "hp_under", "hp100",
  "add", "adapt", "cdr_all", "cd_mult", "final", "patk", "matk", "aspd", "extra_dmg", "pdef_ign", "mdef_ign", "tough", "active"]);
const find = name => ACCESSORIES.find(a => a.name === name);

test("악세 데이터: 시트에서 옮긴 개수 (거의 안 쓰는 10개는 뺐다)", () => {
  assert.equal(ACCESSORIES.length, 153);
  assert.equal(WEAPON_AVATARS.length, 23);
  assert.equal(Object.keys(ARMOR_AVATARS).length, 23);
  assert.equal(OUTFITS.length, 7);
});

test("악세 데이터: 모든 부위에 아바타 악세와 일반 악세가 있다", () => {
  for (const s of ACC_SLOTS) for (const layer of Object.keys(ACC_LAYERS))
    assert.ok(ACCESSORIES.some(a => a.slot === s.key && a.layer === layer), `${s.name} ${layer}`);
});

test("악세 데이터: 이름이 겹치지 않고, 능력치 키와 세트 이름이 모두 정의돼 있다", () => {
  assert.equal(new Set(ACCESSORIES.map(a => a.name)).size, ACCESSORIES.length);
  const all = [...ACCESSORIES, ...WEAPON_AVATARS, ...OUTFITS].map(a => a.stats)
    .concat(Object.values(ARMOR_AVATARS).flatMap(p => Object.values(p)))
    .concat(Object.values(SETS).flatMap(s => Object.values(s.stages)));
  for (const st of all) for (const k of Object.keys(st)) assert.ok(KEYS.has(k), k);
  for (const a of ACCESSORIES) if (a.set !== "없음" && !a.atma && a.set !== "연화세계 정령왕") assert.ok(SETS[a.set], a.set);
  for (const a of ACCESSORIES) if (a.layer === "avatar") assert.equal(SETS[a.set].kind, "avatar", a.name);
  for (const w of WEAPON_AVATARS) assert.equal(SETS[w.set].kind, "avatar", w.name);
  for (const n of Object.keys(ARMOR_AVATARS)) assert.equal(SETS[n].kind, "armor", n);
});

test("악세 데이터: 시트 값과 같다", () => {
  assert.deepEqual(find("그란디플로라 : 만개한 브로치").stats, { patk: 30, matk: 30, crit: 0.02, polar: 0.02, adapt: 0.02 });
  assert.deepEqual(find("글리터의 훈장").stats, { crit_dmg: 0.03, adapt: 0.02, cd_mult: 0.01, final: 0.0973 });
  assert.deepEqual(find("팬텀 베일 : 선원의 유품").stats, { patk: 50, matk: 50, hp100: 0.03, cho: 0.03, gang: 0.03, tough: 0.03, active: 0.03 });
  assert.deepEqual(find("아게이트의 파편").stats, { pdef_ign: 0.05, mdef_ign: 0.05, adapt: 0.02 });
  assert.deepEqual(SETS["베리타스 페르소나 무악"].stages, { 2: { polar: 0.03, add: 0.03 }, 3: { hp_over: 0.1, hp_under: 0.1, cho: 0.04, gang: 0.04 } });
  assert.deepEqual(SETS["공중요새의 유산"].stages[2], { crit: 0.05, boss: 0.07 });
  assert.deepEqual(SETS["엘리오스 수호 기사단"].stages, { 3: { all_skill: 0.05, cdr_all: 0.05 }, 4: { aspd: 0.1, adapt: 0.05 } });
  assert.deepEqual(SETS["팬텀 베일"].stages[5], { hp_over: 0.1, hp_under: 0.1 });
});

test("아트마: 다섯 부위에 아트마 악세가 있고, 초목은 곱연 크뎀 30% · 크리 -6%", () => {
  for (const slot of ATMA.pieces) assert.ok(ACCESSORIES.some(a => a.atma && a.slot === slot && a.layer === "normal"), slot);
  assert.equal(ATMA.sets["초목의 아트마"].cd_mult.유니크, 0.30);
  assert.equal(ATMA.sets["초목의 아트마"].fixed.crit, -0.06);
});

test("아트마: 세트 효과는 유니크까지이고, 속성마다 유니크~일반 값이 다 있다", () => {
  assert.equal(ATMA.maxGrade, "유니크");
  const graded = ATMA.grades.slice(ATMA.grades.indexOf(ATMA.maxGrade));
  for (const [name, set] of Object.entries(ATMA.sets))
    for (const [k, v] of Object.entries(set)) if (k !== "fixed") assert.deepEqual(Object.keys(v), graded, name);
});
