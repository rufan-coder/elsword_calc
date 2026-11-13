import { test } from "node:test";
import assert from "node:assert/strict";
import { optimizeGear, LOCKABLE } from "../js/calc/gear-optimize.js";
import { gearScorer, emptyGear, compareGear } from "../js/calc/gear.js";
import { buildSetup } from "../js/calc/buffs.js";
import { resolve } from "../js/calc/stats.js";
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

test("자동 찾기: 쿨감은 DPS에 안 넣고, 목표 초월 쿨감 아래로는 내려가지 않게 한다", () => {
  // 쿨감 5% 악세 3개를 낀 상태. 목표가 없으면 쿨감 악세를 빼서 쿨감이 내려가도 DPS만 본다
  const now = Object.assign(emptyGear(), {
    weapon: "사룡무",
    avatar: { arm: "화랑연가 : 충의의 완갑", neck: "드리밍 오토마타 : 인형의 브로치", support: "그란디플로라 : 환희의 샹들리에" },
    normal: { weapon: "Type-Q 여왕의 훈장", support: "운명의 예언서", bottom: "영혼의 족쇄", ear: "글리터의 훈장" },
  });
  const free = optimizeGear(ctx, now);
  const kept = optimizeGear(ctx, now, { cdrTarget: 0.32 });
  const high = optimizeGear(ctx, now, { cdrTarget: 0.36 });
  assert.ok(free.cdr < 0.32);                                   // 목표가 없으면 쿨감은 신경 쓰지 않는다
  assert.ok(kept.cdrMet && kept.cdr >= 0.32 - 1e-9);
  assert.ok(high.cdrMet && high.cdr >= 0.36 - 1e-9);
  assert.ok(free.gain >= kept.gain - 1e-12 && kept.gain >= high.gain - 1e-12);   // 조건이 빡빡할수록 DPS는 같거나 낮다
  // 쿨감 악세를 바꿔도 DPS 변화에는 쿨감 몫이 없다
  const sc = gearScorer(ctx, now);
  const noCdr = structuredClone(now); noCdr.avatar.arm = null;
  const both = structuredClone(noCdr); both.avatar.arm = "화랑연가 : 충의의 완갑";
  near(sc.evaluate(both).value, sc.evaluate(now).value, 12);
  assert.equal(sc.evaluate(noCdr).shifted.win.cdr_cho.toFixed(4), "0.2700");
});

test("자동 찾기: 목표를 맞출 수 없으면 가장 가깝게 맞추고 알려 준다", () => {
  const locked = LOCKABLE.filter(k => k !== "avatar.arm");   // 팔 한 칸만 바꿀 수 있다 -> 쿨감은 많아야 +5%
  const r = optimizeGear(ctx, NOW, { locked, cdrTarget: 0.40 });
  assert.equal(r.cdrMet, false);
  near(r.cdr, 0.37, 10);
});

test("마을 버프: 바꿔 보기에서 버프를 바꾸면 그 버프로 계산한다", () => {
  const { setup } = buildSetup({ town: "온천 버프", pantsEnhance: 11, shoesEnhance: 11, yellow: true, stoneCdr: 0.3, stoneDur: 0 });
  const after = Object.assign(emptyGear(), { town: "수색대원의 결의" });   // 온천(크리·극대 5%) -> 수색대원(적응력 2%, 보뎀 2%)
  // 보뎀만 있으면 보뎀 2%만큼
  const c = { win: { boss: 1.9 }, job: PICARO.job, resist: 0.3, setup, town: "온천 버프" };
  const boss = resolve(c.win, c.job, c.resist, setup).boss;
  near(compareGear(c, emptyGear(), after).gain, (1 + boss + 0.02) / (1 + boss) - 1, 12);
  near(compareGear(c, emptyGear(), Object.assign(emptyGear(), { town: "온천 버프" })).gain, 0, 12);   // 지금과 같은 버프
  // 적응력: 57% + 2% = 59% (상한 60% 안)
  const c2 = { win: { adapt: 0.57, super_adapt: 0.1 }, job: PICARO.job, resist: 0.3, setup: { ...setup, debuff: 0.95 }, town: "온천 버프" };
  near(compareGear(c2, emptyGear(), after).gain, (1 - (0.95 - 0.69)) / (1 - (0.95 - 0.67)) - 1, 12);
});

test("마을 버프: 자동 찾기는 버프마다 따로 찾아 비교하고, 고정하면 지금 버프만 쓴다", () => {
  const { setup } = buildSetup({ town: "엘 하우스(강화)", pantsEnhance: 11, shoesEnhance: 11, yellow: true, stoneCdr: 0.3, stoneDur: 0 });
  const c = { ...ctx, setup: { ...setup, debuff: 0.95 }, town: "엘 하우스(강화)" };
  const locked = LOCKABLE.filter(k => k.startsWith("normal.") || k === "element");
  const r = optimizeGear(c, NOW, { locked });
  assert.deepEqual(r.byTown.map(x => x.town).sort(), ["수색대원의 결의", "엘 하우스(강화)"]);   // 온천은 엘 하우스보다 나을 수 없어서 뺀다
  assert.equal(r.gain, r.byTown[0].gain);
  for (let i = 1; i < r.byTown.length; i++) assert.ok(r.byTown[i - 1].gain >= r.byTown[i].gain - 1e-12);
  near(gearScorer(c, NOW).evaluate(r.gear).value - 1, r.gain, 12);
  const fixed = optimizeGear(c, NOW, { locked: locked.concat(["town"]) });
  assert.equal(fixed.byTown.length, 1);
  assert.equal(fixed.gear.town, null);
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
