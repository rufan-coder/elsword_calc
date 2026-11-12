import { test } from "node:test";
import assert from "node:assert/strict";
import { optimizeGear, LOCKABLE } from "../js/calc/gear-optimize.js";
import { gearScorer, emptyGear } from "../js/calc/gear.js";
import { capOver } from "../js/calc/caps.js";
import { ACCESSORIES, WEAPON_AVATARS } from "../js/data/accessories.js";
import { near, PICARO } from "./helpers.js";

const ctx = {
  win: { ...PICARO.win, all_skill: 1.2, polar: 0.4, add: 0.3, hp_over: 0.2, hp_under: 0.2, hp100: 0.2, atk_pct: 0.5, adapt: 0.59, super_adapt: 0.1, cdr_gang: 0.32, cdr_cho: 0.32 },
  job: PICARO.job, resist: PICARO.resist, setup: { ...PICARO.setup, debuff: 0.95, town_adapt: 0 },
};
const NOW = Object.assign(emptyGear(), {
  weapon: "사룡무",
  avatar: { weapon: "베리타스 페르소나 : 교도의 로자리오", ear: "베리타스 페르소나 : 교도의 증표", face_top: "팬텀 베일 : 선장의 트리코른", support: "팬텀 베일 : 뱃사람의 나침반", ring: "팬텀 베일 : 선원의 유품" },
  normal: { weapon: "Type-Q 여왕의 훈장", support: "운명의 예언서", bottom: "영혼의 족쇄", ear: "글리터의 훈장", ring: "거울 세계의 조각" },
  wavatar: "베리타스 페르소나 무기",
  armor: Object.fromEntries(["hair", "top", "bottom", "gloves", "shoes"].map(p => [p, "베리타스 페르소나"])),
});

test("자동 찾기: 지금보다 나빠지지 않고, 답의 DPS 변화는 교체 비교로 다시 계산해도 같다", () => {
  const r = optimizeGear(ctx, NOW);
  assert.ok(r.gain > 0);
  near(gearScorer(ctx, NOW).evaluate(r.gear).value - 1, r.gain, 12);
  assert.equal(r.gear.weapon, "사룡무");                         // 무기 종류는 그대로
  assert.notEqual(r.gear.normal.ring, r.gear.normal.ring2);       // 같은 반지 두 개는 안 낀다
});

test("자동 찾기: 고정한 칸은 지금 것 그대로 둔다", () => {
  const locked = ["avatar.weapon", "avatar.ear", "wavatar", "armor", "normal.ring", "normal.ear", "element"];
  const r = optimizeGear(ctx, NOW, { locked });
  assert.equal(r.gear.avatar.weapon, NOW.avatar.weapon);
  assert.equal(r.gear.avatar.ear, NOW.avatar.ear);
  assert.equal(r.gear.wavatar, NOW.wavatar);
  assert.equal(r.gear.armor.hair, "베리타스 페르소나");
  assert.equal(r.gear.normal.ring, NOW.normal.ring);
  assert.equal(r.gear.normal.ear, NOW.normal.ear);
  assert.equal(r.gear.atma.element, NOW.atma.element);
  assert.ok(LOCKABLE.includes("normal.ring2") && LOCKABLE.includes("armor"));
});

test("자동 찾기: 칸이 몇 개뿐일 때는 모든 경우를 다 따져 본 답과 같다", () => {
  // 아바타 상의·얼굴(중)·목걸이, 무기 아바타만 풀고 나머지는 모두 고정 -> 모든 조합을 직접 계산해서 비교
  const open = ["avatar.top", "avatar.face_mid", "avatar.neck", "wavatar"];
  const locked = LOCKABLE.filter(k => !open.includes(k));
  const r = optimizeGear(ctx, NOW, { locked });
  const score = gearScorer(ctx, NOW).evaluate;
  const items = slot => ACCESSORIES.filter(a => a.layer === "avatar" && a.slot === slot).map(a => a.name);
  let best = -Infinity;
  for (const top of items("top")) for (const mid of items("face_mid")) for (const neck of items("neck")) for (const w of WEAPON_AVATARS) {
    const g = structuredClone(NOW);
    Object.assign(g.avatar, { top, face_mid: mid, neck }); g.wavatar = w.name;
    best = Math.max(best, score(g).value - 1);
  }
  near(r.gain, best, 12);
});

test("자동 찾기: 같은 입력이면 늘 같은 답", () => {
  const a = optimizeGear(ctx, NOW), b = optimizeGear(ctx, NOW);
  assert.deepEqual(a.gear, b.gear);
});

test("자동 찾기: 고정하지 않은 아트마 칸에 아트마를 끼우면 유니크로 계산한다", () => {
  const r = optimizeGear(ctx, NOW);
  for (const slot of ["face_mid", "face_low", "arm", "neck"]) {
    const item = ACCESSORIES.find(a => a.name === r.gear.normal[slot]);
    if (item && item.atma) assert.equal(r.gear.atma.grades[slot], "유니크");
  }
});

test("상한 초과: 적응력은 마을 버프 포함 60%, 쿨감 35%, 양극화 60%를 넘은 만큼", () => {
  const o = capOver({ adapt: 0.59, cdr_gang: 0.36, cdr_cho: 0.30, polar: 0.65 }, { town_adapt: 0.03 });
  near(o.adapt, 0.02, 10); near(o.cdr_gang, 0.01, 10); near(o.polar, 0.05, 10);
  assert.equal(o.cdr_cho, undefined);
  assert.deepEqual(capOver({ adapt: 0.55 }, { town_adapt: 0.03 }), {});
});

test("상한 초과: 크리티컬은 버프·패시브까지 더한 실전 값이 100%를 넘을 때만", () => {
  const { job, resist, setup } = PICARO;
  assert.equal(capOver({ crit: 0.83, crit_dmg: 2 }, setup, job, resist).crit, undefined);
  assert.ok(capOver({ crit: 0.99, crit_dmg: 2 }, setup, job, 0).crit > 0);
});
