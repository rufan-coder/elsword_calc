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

test("크리·극대 소켓 기준: 소켓(6%)을 바꿔 이득일 때만 크리·극대 변화를 센다", () => {
  const scorer = gearScorer, compare = compareGear, empty = emptyGear;
  const exact = { win: PICARO.win, job: PICARO.job, resist: PICARO.resist, setup: PICARO.setup };
  const ctx = { ...exact, sockets: { partners: [{ name: "사냥석 보뎀 2.5%", stats: { boss: 0.025 } }] } };
  const val = (c, v) => scorer(c, empty()).valueOf({ visible: v, cdMults: [], finals: [] }, null) - 1;
  const boss = PICARO.win.boss + PICARO.setup.guild_boss + PICARO.job.boss;
  assert.ok(val(exact, { crit: 0.02 }) > 0);                       // 그대로 계산하면 크리 2%도 DPS가 오른다
  assert.equal(val(ctx, { crit: 0.02 }), 0);                        // 크리 6% 한 칸을 사냥석으로 바꿔도 손해 -> 없는 것으로
  assert.ok(Math.abs(val(ctx, { crit: 0.06 }) - ((1 + boss + 0.025) / (1 + boss) - 1)) < 1e-12);   // 크리 6% -> 사냥석 2.5%로 바꾼 값
  assert.ok(val(ctx, { crit: -0.02 }) >= val(exact, { crit: -0.02 }) - 1e-12);   // 줄면 크리를 더 끼우는 쪽이 나으면 그 값
  const r = compare(ctx, empty(), Object.assign(empty(), { avatar: { top: "비룡승운 : 호걸의 긍지" } }));
  assert.deepEqual(r.dropped, ["crit"]); assert.deepEqual(r.swaps, []);
  assert.ok(Math.abs(r.win.crit - compare(exact, empty(), Object.assign(empty(), { avatar: { top: "비룡승운 : 호걸의 긍지" } })).win.crit) < 1e-12);   // 스탯창에는 오른 크리 그대로
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
