import { test } from "node:test";
import assert from "node:assert/strict";
import { compareGear, gearEffects, atmaSet, emptyGear, gearScorer } from "../js/calc/gear.js";
import { resolve, dpsIndex } from "../js/calc/stats.js";
import { applyOption } from "../js/calc/compare.js";
import { near, PICARO } from "./helpers.js";

const ctx = { win: { ...PICARO.win, boss: 1.9, adapt: 0.59, super_adapt: 0.1, cdr_gang: 0.32, cdr_cho: 0.32 }, job: PICARO.job, resist: PICARO.resist, setup: { ...PICARO.setup, debuff: 0.95 } };
const gear = (patch = {}) => Object.assign(emptyGear(), patch);
const ATMA = n => `찬란한 연화세계 정령왕의 ${n} - OO의 아트마`;
const MANDALA = g => `장엄한 연화세계 정령왕의 만다라 - OO의 니르바나(${g}, 100강배)`;

test("장비 교체: 같은 장비면 변화가 없다", () => {
  const g = gear({ normal: { bottom: "글로잉 플라워", weapon: "Type-Q 여왕의 훈장" }, avatar: { ring: "팬텀 베일 : 선원의 유품" } });
  near(compareGear(ctx, g, structuredClone(g)).gain, 0, 12);
});

test("장비 교체: 크리 10% 악세를 빼면 옵션 비교의 크리 -10%와 같다", () => {
  const r = compareGear(ctx, gear({ normal: { bottom: "글로잉 플라워" } }), gear({ normal: { bottom: "하르코니움 코어 필드" } }));
  const base = resolve(ctx.win, ctx.job, ctx.resist, ctx.setup);
  near(r.gain, dpsIndex(applyOption(base, { crit_stat: -0.10 })) / dpsIndex(base) - 1, 10);   // 적응력 2%는 두 악세가 같다
  assert.deepEqual(Object.keys(r.ignored), ["aspd"]);                                          // 동작 속도는 계산에서 빠진다
});

test("장비 교체: 최종 데미지와 곱연 크뎀은 스탯창과 따로 곱한다", () => {
  const r = compareGear(ctx, gear(), gear({ normal: { ear: "글리터의 훈장" } }));   // 크뎀 3%, 적응력 2%, 곱연 크뎀 1%, 최종 x1.0973
  assert.deepEqual(r.after.finals, [0.0973]);
  assert.deepEqual(r.after.cdMults, [0.01]);
  assert.ok(r.gain > 0.0973);
});

test("세트: 무기 아바타도 무악 세트 개수에 들어가고, 단계 효과가 쌓인다", () => {
  const g = gear({ avatar: { weapon: "베리타스 페르소나 : 교도의 로자리오", ear: "베리타스 페르소나 : 교도의 증표" }, wavatar: "베리타스 페르소나 무기" });
  const fx = gearEffects(g, "마법");
  const s = fx.sets.find(x => x.name === "베리타스 페르소나 무악");
  assert.deepEqual([s.count, s.stages, s.active], [3, [2, 3], true]);
});

test("세트: 무악 세트는 3개까지만 켜지고, 고른 세트를 따른다", () => {
  const two = (a, b) => ({ [a[0]]: a[1], [b[0]]: b[1] });
  const g = gear({ avatar: {
    ...two(["weapon", "베리타스 페르소나 : 교도의 로자리오"], ["ear", "베리타스 페르소나 : 교도의 증표"]),
    ...two(["face_top", "팬텀 베일 : 선장의 트리코른"], ["support", "팬텀 베일 : 뱃사람의 나침반"]),
    ...two(["face_mid", "화랑연가 : 비련의 조협"], ["arm", "화랑연가 : 충의의 완갑"]),
    ...two(["face_low", "그란디플로라 : 요정의 자취"], ["top", "그란디플로라 : 요정의 날개"]),
  } });
  assert.equal(gearEffects(g, "마법").sets.filter(s => s.active).length, 3);
  const chosen = ["그란디플로라 무악", "화랑연가 무악", "팬텀 베일 무악"];
  assert.deepEqual(gearEffects(g, "마법", chosen).sets.filter(s => s.active).map(s => s.name).sort(), chosen.slice().sort());
  // 바꾼 쪽은 고르지 않았으면 DPS가 가장 높은 3개를 고른다 -> 직접 고른 어떤 조합보다 낮지 않다
  const auto = compareGear(ctx, gear(), g).gain;
  assert.ok(auto >= compareGear(ctx, gear(), Object.assign({}, g, { avatarSets: chosen })).gain - 1e-12);
});

test("아트마: 4개 이상이면 위에서 4번째 등급, 레전드리는 유니크로 센다", () => {
  const base = { face_mid: ATMA("제삼안"), face_low: ATMA("영락"), arm: ATMA("팔찌"), neck: ATMA("목 장식") };
  assert.equal(atmaSet(gear({ normal: base })).grade, "유니크");
  assert.equal(atmaSet(gear({ normal: base, atma: { element: "유수", grades: { neck: "엘리트" } } })).grade, "엘리트");
  assert.equal(atmaSet(gear({ normal: { ...base, top: MANDALA("레전드리") }, atma: { element: "유수", grades: { neck: "엘리트" } } })).grade, "유니크");
  assert.equal(atmaSet(gear({ normal: { face_mid: base.face_mid, arm: base.arm, top: MANDALA("레전드리") } })).grade, null);
});

test("아트마: 초목은 곱연 크뎀 30%와 크리 -6%, 유수는 최종 데미지 20%", () => {
  const normal = { face_mid: ATMA("제삼안"), arm: ATMA("팔찌"), neck: ATMA("목 장식"), top: MANDALA("유니크") };
  const cho = gearEffects(gear({ normal, atma: { element: "초목", grades: {} } }), "마법");
  assert.deepEqual([cho.cdMults, cho.visible.crit], [[0.30], -0.06]);
  const yu = gearEffects(gear({ normal, atma: { element: "유수", grades: {} } }), "마법");
  assert.deepEqual(yu.finals, [0.20]);
});

test("장비 교체: 스탯창 칸이 비어 있으면 그 효과는 빼고 알려 준다", () => {
  const win = { ...ctx.win }; delete win.boss;
  const r = compareGear({ ...ctx, win }, gear(), gear({ normal: { weapon: "Type-Q 여왕의 훈장", support: "운명의 예언서" } }));   // 공중요새의 유산 2세트: 크리 5%, 보뎀 7%
  assert.ok(r.blank.includes("boss"));
});

test("장비 교체: 수치를 모르는 악세는 따로 알려 준다", () => {
  assert.deepEqual(gearEffects(gear({ avatar: { support: "엘피어스의 킨더" } }), "마법").unknown, ["엘피어스의 킨더"]);
});

test("세트: 사룡무는 공중요새의 유산 개수에 들어간다", () => {
  const normal = { weapon: "Type-Q 여왕의 훈장", support: "운명의 예언서", bottom: "영혼의 족쇄" };
  const count = g => gearEffects(g, "마법").sets.find(s => s.name === "공중요새의 유산").count;
  assert.equal(count(gear({ normal })), 3);
  assert.equal(count(gear({ normal, weapon: "사룡무" })), 4);
  // 사룡무가 있으면 족쇄를 빼도 3세트가 유지되고, 없으면 3세트 효과(양극화 5%, 추가 피해 5%)가 꺼진다
  const swap = w => compareGear(ctx, gear({ normal, weapon: w }), gear({ normal: { ...normal, bottom: "글로잉 플라워" }, weapon: w }));
  assert.equal(swap("사룡무").delta.polar, undefined);
  near(swap(null).delta.polar, -0.05, 10);
});

test("크리·극대 소켓 기준: 바뀐 만큼(6% 단위 반올림) 소켓을 바꿔서 센다", () => {
  const scorer = gearScorer, compare = compareGear, empty = emptyGear;
  const exact = { win: PICARO.win, job: PICARO.job, resist: PICARO.resist, setup: PICARO.setup };
  const ctx = { ...exact, sockets: { partners: [{ name: "사냥석 보뎀 2.5%", stats: { boss: 0.025 } }] } };
  const val = (c, v) => scorer(c, empty()).valueOf({ visible: v, cdMults: [], finals: [] }, null) - 1;
  const boss = PICARO.win.boss + PICARO.setup.guild_boss + PICARO.job.boss;
  assert.ok(val(exact, { crit: 0.02 }) > 0);                       // 그대로 계산하면 크리 2%도 DPS가 오른다
  assert.equal(val(ctx, { crit: 0.02 }), val(exact, { crit: 0.02 }));   // 3% 미만: 소켓은 그대로, 크리 2%를 그대로 센다
  assert.equal(val(ctx, { crit: -0.02 }), val(exact, { crit: -0.02 }));
  assert.ok(Math.abs(val(ctx, { crit: 0.06 }) - ((1 + boss + 0.025) / (1 + boss) - 1)) < 1e-12);   // 크리 6% -> 사냥석 2.5%로 바꾼 값
  // 크리 +10% -> 2칸: 크리 −2%, 보뎀 +5% 와 같다 (최적이 아니어도)
  assert.ok(Math.abs(val(ctx, { crit: 0.10 }) - val(exact, { crit: -0.02, boss: 0.05 })) < 1e-12);
  // 크리 −10% -> 사냥석 2칸을 크리로: 크리 +2%, 보뎀 −5%
  assert.ok(Math.abs(val(ctx, { crit: -0.10 }) - val(exact, { crit: 0.02, boss: -0.05 })) < 1e-12);
  assert.ok(Math.abs(val(ctx, { crit: 0.03 }) - val(exact, { crit: -0.03, boss: 0.025 })) < 1e-12);   // 0.5칸은 올려서 1칸
  const flower = Object.assign(empty(), { normal: { bottom: "글로잉 플라워" } });
  const r = compare(ctx, empty(), flower);
  assert.deepEqual(r.swaps.map(s => [s.k, s.dir, s.name]), [["crit", -1, "사냥석 보뎀 2.5%"], ["crit", -1, "사냥석 보뎀 2.5%"]]);
  assert.ok(Math.abs(r.win.crit - compare(exact, empty(), flower).win.crit) < 1e-12);   // 스탯창 표(소켓 반영 전)에는 오른 크리 그대로
});

// ----- 방어구 -----
const EQ = (type, enh, ref, set = null) => ({ top: { type, enh, ref }, bottom: { type, enh, ref }, gloves: { type, enh, ref }, shoes: { type, enh, ref }, set });

test("방어구: 엑사스케일 → 네블론 (4부위 12강 21재련) 은 적응력 -4%, 초적응력 +10%, 크뎀 -12%, 공격력% +4%", () => {
  const r = compareGear(ctx, gear({ equip: EQ("엑사스케일", 12, 21, "연산") }), gear({ equip: EQ("네블론", 12, 21, "연산") }));
  const d = Object.fromEntries(Object.entries(r.delta).filter(([, v]) => Math.abs(v) > 1e-12));
  assert.deepEqual(Object.keys(d).sort(), ["adapt", "atk_pct", "crit_dmg", "super_adapt"]);
  near(d.adapt, -0.04, 12); near(d.super_adapt, 0.10, 12); near(d.crit_dmg, -0.12, 12); near(d.atk_pct, 0.04, 12);
  assert.deepEqual(r.hidden.final[0], r.hidden.final[1]);   // 상의 강화(최종뎀)·연산 세트는 그대로
  assert.deepEqual([r.after.nebulon, r.before.nebulon], [4, 0]);
});

test("방어구: 부위 강화 효과 (상의 최종뎀, 장갑 모스뎀) 와 강렬·초월 재련", () => {
  const fx = gearEffects(gear({ equip: { top: { type: "엑사스케일", enh: 12, ref: 21 }, gloves: { type: "엑사스케일", enh: 11, ref: 0 }, set: null } }), "물리");
  assert.deepEqual(fx.finals.map(x => +x.toFixed(6)), [0.14]);
  near(fx.visible.all_skill, 0.55, 12);
  near(fx.visible.cho, 0.10, 12); near(fx.visible.gang, 0.10, 12);
  assert.equal(fx.fixedAtk, 2000);                           // 고정 공격력은 따로 모아 두기만 한다
});

test("방어구: 4세트는 4부위가 모두 그 세트를 쓸 수 있는 방어구일 때만 켜진다", () => {
  const on = gearEffects(gear({ equip: EQ("네블론", 0, 0, "연산") }), "물리");
  assert.deepEqual(on.equipSet, { name: "연산", active: true });
  assert.deepEqual(on.finals.map(x => +x.toFixed(6)), [0.02, 0.2]);   // 상의 0강 2% + 연산 20%
  near(on.visible.adapt, 0.02, 12);
  const mixed = EQ("네블론", 0, 0, "연산"); mixed.gloves = { type: "테네브로스", enh: 0, ref: 0 };
  assert.equal(gearEffects(gear({ equip: mixed }), "물리").equipSet.active, false);
  const three = EQ("네블론", 0, 0, "연산"); three.shoes = null;
  assert.equal(gearEffects(gear({ equip: three }), "물리").equipSet.active, false);
  const tene = gearEffects(gear({ equip: EQ("테네브로스", 0, 0, "테네브로스-(속저 모스뎀)") }), "마법");
  near(tene.visible.atk_pct, 0.05, 12);
});

test("방어구: 하의·신발 강화가 바뀌면 버프 세팅의 하의 크리·신발 극대 곱연산을 그만큼 옮긴다", () => {
  const one = (part, enh) => gear({ equip: { [part]: { type: "네블론", enh, ref: 0 }, set: null } });
  const base = resolve(ctx.win, ctx.job, ctx.resist, ctx.setup);
  const r = compareGear(ctx, one("bottom", 12), one("bottom", 13));   // 12강·13강은 강화 효과(보뎀·초적응)가 같다
  const s2 = { ...ctx.setup, crit_mults: [ctx.setup.crit_mults[0] + 0.01, ...ctx.setup.crit_mults.slice(1)] };
  near(r.gain, dpsIndex(resolve(ctx.win, ctx.job, ctx.resist, s2)) / dpsIndex(base) - 1, 10);
  near(r.setup.crit_mults[0], ctx.setup.crit_mults[0] + 0.01, 12);
  const m = compareGear(ctx, one("shoes", 12), one("shoes", 9));
  near(m.setup.maxi_mults[0], ctx.setup.maxi_mults[0] - 0.03, 12);
  // 지금 방어구를 안 넣은 부위는 옮기지 않는다
  near(compareGear(ctx, gear(), one("bottom", 12)).setup.crit_mults[0], ctx.setup.crit_mults[0], 12);
});

test("방어구: 네블론 옵션 변환은 합연으로 더하고, 강화당 옵션은 그 부위 강화를 곱한다", () => {
  const opts = [{ name: "크리티컬", step: 10 }, { name: "강화 1당 물마공 (%)", step: 10 }, { name: "강인한 스킬 데미지", step: 10 }];
  const fx = (type, o) => gearEffects(gear({ equip: { top: { type, enh: 12, ref: 0, opts: o }, set: null } }), "물리").visible;
  const a = fx("네블론", opts), b = fx("네블론", []);
  near(a.crit - (b.crit || 0), 0.012, 12);                 // 크리 1.2 -> +1.2%
  near(a.atk_pct - (b.atk_pct || 0), 0.024, 12);           // 강화당 0.2% x 12강
  assert.deepEqual(Object.keys(a).sort(), ["atk_pct", "boss", "crit", "super_adapt"]);   // 강인한 스킬 데미지는 계산 안 함
  assert.deepEqual(fx("엑사스케일", opts), fx("엑사스케일", []));   // 옵션 변환은 네블론만
});

test("방어구: 네블론 부위가 늘면 늘어난 소켓에 가장 좋은 마법석을 끼우고, 줄면 손해가 가장 적은 것을 뺀다", () => {
  const stone = { name: "사냥석", stats: { boss: 0.025 } };
  const c = { ...ctx, slotStone: stone };
  const one = type => gear({ equip: { top: { type, enh: 12, ref: 21 }, set: null } });
  const up = compareGear(c, one("엑사스케일"), one("네블론"));
  assert.deepEqual(up.swaps.map(x => [x.k, x.dir]), [["slot", 1]]);
  // 소켓까지 넣은 스탯창은 장비만 바꾼 스탯창에 고른 마법석 한 칸을 더한 것
  const add = { "사냥석": { boss: 0.025 }, "크리 6%": { crit: 0.06 }, "극대 6%": { maxi: 0.06 } }[up.swaps[0].name];
  assert.ok(add);
  if (add.boss) near(up.real.boss - up.win.boss, 0.025, 12);
  // 사냥석까지 후보에 넣으면 크리·극대만 후보일 때보다 낮을 수 없다
  const s = gearScorer(c, one("엑사스케일")), fx = s.evaluate(one("네블론")).fx;
  const plain = gearScorer({ ...ctx }, one("엑사스케일"));   // 후보: 크리·극대만
  assert.ok(s.evaluate(one("네블론")).value >= plain.evaluate(one("네블론")).value - 1e-12);
  assert.equal(fx.nebulon, 1);
  const down = compareGear(c, one("네블론"), one("엑사스케일"));
  assert.deepEqual(down.swaps.map(x => [x.k, x.dir]), [["slot", -1]]);
  assert.deepEqual(compareGear(c, one("네블론"), one("네블론")).swaps, []);
});

test("방어구: 네블론 카트리지는 같은 종류면 가장 높은 레벨 하나만 세고, 보이는 효과와 오버플로우 최종 데미지를 넣는다", () => {
  const neb = cart => ({ type: "네블론", enh: 0, ref: 0, cart });
  const eq = (...carts) => ({ top: neb(carts[0]), bottom: neb(carts[1]), gloves: neb(carts[2]), shoes: neb(carts[3]), set: null });
  const fx = e => gearEffects(gear({ equip: e }), "물리");
  const base = fx(eq(null, null, null, null));
  const a = fx(eq({ name: "배틀 카트리지 Type - 4", lv: 6 }, { name: "배틀 카트리지 Type - 4", lv: 2 }, { name: "배틀 카트리지 Type - 3", lv: 4 }, { name: "하이퍼 카트리지 [오버플로우]", lv: 3 }));
  near(a.visible.crit_dmg - (base.visible.crit_dmg || 0), 0.03, 12);   // 배틀 4 Lv6 하나만 (Lv2는 안 셈)
  near(a.visible.cho - (base.visible.cho || 0), 0.02, 12); near(a.visible.gang - (base.visible.gang || 0), 0.02, 12);
  assert.deepEqual(a.finals.slice().sort(), base.finals.concat([0.015]).sort());   // 오버플로우 Lv3 최종 1.5%
  assert.deepEqual(a.cartridges.counts, { hyper: 1, support: 0, battle: 2 });
  const u = fx(eq({ name: "하이퍼 카트리지 [앰플리파이어]", lv: 6 }, { name: "서포트 카트리지 Type - 1", lv: 6 }, null, null));
  assert.deepEqual(u.unknown, ["하이퍼 카트리지 [앰플리파이어]"]);   // 수치 모름 -> 효과 없이
  assert.deepEqual(u.visible, base.visible); assert.deepEqual(u.finals, base.finals);   // 서포트 1은 서포터 전용
  assert.deepEqual(u.cartridges.counts, { hyper: 1, support: 1, battle: 0 });         // 개수에는 들어간다
});

test("방어구: 네블론이 있으면 글리터의 훈장은 그 카트리지 개수로 (곱연 크뎀: 배틀·클래식, 최종 데미지: 하이퍼·서포트)", () => {
  const neb = cart => ({ type: "네블론", enh: 0, ref: 0, cart });
  const g = (...carts) => gear({ normal: { ear: "글리터의 훈장" }, equip: { top: neb(carts[0]), bottom: neb(carts[1]), gloves: neb(carts[2] || null), shoes: neb(carts[3] || null), set: null } });
  const two = gearEffects(g({ name: "배틀 카트리지 Type - 4", lv: 6 }, { name: "클래식 카트리지 Type - 1", lv: 6 }, { name: "하이퍼 카트리지 [엑셀레이션]", lv: 6 }, { name: "하이퍼 카트리지 [뮤테이션]", lv: 6 }), "물리", null, null, 0);
  assert.deepEqual(two.cdMults, [0.01]);                              // 배틀·클래식 2개 (버프 세팅의 0개 대신)
  assert.ok(two.finals.some(f => Math.abs(f - (1.06 * 1.03 * 1.01 - 1)) < 1e-6));   // 하이퍼 2개
  const none = gearEffects(g(null, null), "물리", null, null, 2);
  assert.deepEqual(none.cdMults, []);                                 // 네블론에 카트리지가 없으면 0개
  assert.ok(none.finals.some(f => Math.abs(f - (1.06 * 1.03 - 1)) < 1e-6));
  const exa = gearEffects(gear({ normal: { ear: "글리터의 훈장" } }), "물리", null, null, 2);
  assert.deepEqual([exa.cdMults, exa.finals], [[0.01], [0.0973]]);    // 네블론이 없으면 지금처럼 버프 세팅 개수·아이템 값
});

test("방어구: 시줌(추가 효과)은 모든 방어구에 붙고, 크리·극대는 점감 전 합연, 모스뎀은 합연으로 더한다", () => {
  const fx = (type, sijum) => gearEffects(gear({ equip: { top: { type, enh: 0, ref: 0, sijum }, set: null } }), "물리").visible;
  const lines = [{ name: "크리티컬", step: 3 }, { name: "극대화", step: 1 }, { name: "모스뎀", step: 1 }];
  for (const type of ["엑사스케일", "테네브로스", "네블론"]) {
    const a = fx(type, lines), b = fx(type, []);
    near(a.crit - (b.crit || 0), 0.02, 12); near(a.maxi - (b.maxi || 0), 0.01, 12); near(a.all_skill - (b.all_skill || 0), 0.005, 12);
  }
  // 크리 2% 는 스탯창 크리에 점감 전 값으로 더해진다 (다른 악세의 크리와 같다)
  const r = compareGear(ctx, gear({ equip: { top: { type: "엑사스케일", enh: 0, ref: 0, sijum: [] }, set: null } }), gear({ equip: { top: { type: "엑사스케일", enh: 0, ref: 0, sijum: [{ name: "크리티컬", step: 3 }] }, set: null } }));
  near(r.delta.crit, 0.02, 12);
  assert.ok(r.win.crit > ctx.win.crit && r.win.crit - ctx.win.crit < 0.02);   // 점감이 걸려서 2%p보다 적게 오른다
});
