// 동작 속도: 엘리오스 마이너 갤러리 "'동작속도' 스탯에 대한 정보"(2025.09)의 예시와 같은지.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aspdCalc, aspdBuffs, aspdDim, aspdRaw, classAspd } from "../js/calc/aspd.js";
import { ASPD_SKILLS } from "../js/data/aspd.js";
import { CLASS } from "../js/data/classes.js";
import { buildSetup } from "../js/calc/buffs.js";
import { near } from "./helpers.js";

test("곱연산 버프는 서로 곱한다 (칭호 15% + 헤일로 3% = 18.45%)", () => {
  near(aspdCalc(0, [0.15, 0.03], 0).multNormal, 1.1845, 12);
});

test("곱연산은 x1.4, 최종은 70%에서 멈춘다", () => {
  const a = aspdCalc(0.30, [0.15, 0.21, 0.10, 0.03], 0);   // 곱하면 57.66%지만 40%까지만
  near(a.multNormal, 1.4, 12);
  near(a.normal, 0.70, 12);                                // 1.3 x 1.4 = 1.82 가 아니라 1.70
});

test("글의 표: 천장(70%)에 닿는 스탯창 동속", () => {
  near(aspdCalc(0, [0.10, 0.15, 0.03]).need, 1.7 / 1.4 - 1, 12);       // 곱연 40% 꽉 참 -> 21.43%
  near(aspdCalc(0, [0.10, 0.03]).need, 1.7 / (1.1 * 1.21 * 1.03) - 1, 12);   // 파티 + 격려 + 헤일로 -> 24%
  near(aspdCalc(0, [0.10, 0.03]).need, 0.24, 3);
  const noEnc = aspdCalc(0.30, [0.10, 0.15, 0.03], 0);                  // 파티 + 칭호 + 헤일로 -> 69.38%
  near(noEnc.normal, 1.3 * 1.1 * 1.15 * 1.03 - 1, 12);
  assert.equal(noEnc.needNormal, null);
  near(aspdCalc(0.30, [0.10, 0.03], 0).normal, 0.4729, 4);              // 파티 + 헤일로 -> 47.29%
});

test("스탯창 동속이 천장에 필요한 값을 넘으면 그만큼을 초과로 본다 (격려 중 기준)", () => {
  const a = aspdCalc(0.25, [0.15, 0.03, 0.09]);   // 격려 중 곱연이 1.4를 넘어서 21.43%면 충분
  near(a.over, 0.25 - (1.7 / 1.4 - 1), 12);
  near(a.enc, 0.70, 12);
  near(a.normal, 1.25 * 1.15 * 1.03 * 1.09 - 1, 12);
  assert.equal(aspdCalc(0.20, [0.15, 0.03, 0.09]).over, 0);
});

test("버프 세팅: 칭호는 항상, 헤일로는 얼상이 헤일로일 때, 파티 동속 9%는 파티 기준일 때만", () => {
  assert.deepEqual(aspdBuffs("", false).map(x => x.v), [0.15]);
  assert.deepEqual(aspdBuffs("마에스트로 헤일로", true).map(x => x.v), [0.15, 0.03, 0.09]);
  assert.deepEqual(aspdBuffs("침식된 가시뿔", true).map(x => x.v), [0.15, 0.09]);   // 가시뿔 3%는 합연이라 스탯창에 들어 있다
  const base = { town: "온천 버프", pantsEnhance: 11, shoesEnhance: 11, yellow: true, stoneCdr: 0.3, stoneDur: 0 };
  assert.deepEqual(buildSetup({ ...base, party: false }).setup.aspd_mults.map(x => x.name), ["각성 칭호"]);
  assert.deepEqual(buildSetup(base).setup.cd_base_mults, buildSetup({ ...base, party: false }).setup.cd_base_mults);   // 크뎀 파티 버프는 그대로
});

test("점감: 글의 효율표 (20%까지 100%, 24.5%까지 30%, 28.5%까지 20%, 30%까지 10%)", () => {
  near(aspdDim(0.20), 0.20, 12); near(aspdDim(0.35), 0.245, 12); near(aspdDim(0.55), 0.285, 12); near(aspdDim(0.70), 0.30, 12);
  near(aspdDim(1), 0.30, 12);
  near(aspdDim(0.30), 0.20 + 0.10 * 0.3, 12);   // 20% 넘은 10%는 30% 효율 -> 23%
  for (const x of [0, 0.05, 0.2, 0.214, 0.25, 0.29, 0.3]) near(aspdDim(aspdRaw(x)), x, 12);
});

test("전직 점감 합연 패시브는 스탯창 동속을 점감 전으로 되돌려 더한 뒤 다시 점감한다", () => {
  const a = aspdCalc(0.214, [], 0, [0.10]);
  near(a.stat, aspdDim(aspdRaw(0.214) + 0.10), 12);
  near(a.stat, 0.20 + 0.3 * (0.014 / 0.3 + 0.10), 12);   // 21.4%(점감 전 24.67%) + 10% -> 24.4%
  near(aspdCalc(0.214, [], 0).stat, 0.214, 12);             // 패시브가 없으면 스탯창 그대로
  near(aspdCalc(0.25, [], 0, [0.5]).stat, 0.30, 12);          // 30%에서 멈춘다
  // 천장에 필요한 스탯창 값도 패시브 몫을 빼고 구한다
  const n = aspdCalc(0, [0.15, 0.09, 0.03], 0.21, [0.10]).need;   // 곱연 40% 꽉 참 -> 점감 합연 21.43%가 필요
  near(aspdDim(aspdRaw(n) + 0.10), 1.7 / 1.4 - 1, 12);
  assert.equal(aspdCalc(0, [0.15, 0.09, 0.03], 0.21, [0.30]).need, 0);   // 패시브만으로 닿으면 0
});

test("무점감 패시브는 70% 천장 뒤에 더한다", () => {
  const a = aspdCalc(0.30, [0.15, 0.21, 0.10, 0.03], 0, [], [0.08]);
  near(a.normal, 0.78, 12);
  near(aspdCalc(0, [], 0, [], [0.10]).normal, 0.10, 12);
});

test("전직 동속 데이터: 전직 이름이 맞고, 선택 항목의 처음 값은 표대로", () => {
  for (const s of ASPD_SKILLS) for (const c of s.classes) assert.ok(CLASS[c], `${c} 전직이 없다`);
  assert.equal(ASPD_SKILLS.length, 68);
  const ke = classAspd("나이트 엠퍼러");
  assert.deepEqual(ke.map(s => [s.name, s.kind, s.on]), [["검의 길 (활력의 검사)", "mult", false], ["(체인지)아마겟돈", "mult", true], ["전투 준비 (승리를 향한 투지)", "dim", true]]);
  assert.equal(classAspd("룬 마스터")[0].on, false);   // 엘소드 전직 전체
  assert.equal(classAspd("셀레스티아").find(s => s.name === "월광 - 반월").on, true);
  assert.equal(classAspd("리버레이터").find(s => s.name === "월광 - 반월").on, false);
  assert.equal(classAspd("니샤 라비린스").find(s => s.name === "이제 깰 시간이야").on, false);
  assert.equal(classAspd("페이탈 팬텀").find(s => s.name === "샤프슈터 신드롬").toggle, true);
  // 켜고 끈 것은 전직마다 따로
  const o = { "나이트 엠퍼러|검의 길 (활력의 검사)": true, "나이트 엠퍼러|(체인지)아마겟돈": false };
  assert.deepEqual(classAspd("나이트 엠퍼러", o).map(s => s.on), [true, true, true]);   // 선택 항목이 아닌 것은 끌 수 없다
  assert.equal(classAspd("룬 마스터", o)[0].on, false);
  assert.ok(ASPD_SKILLS.filter(s => s.guess).every(s => s.kind === "mult"));
  assert.deepEqual(buildSetup({ town: "온천 버프", cls: "코멧 크루세이더" }).setup.aspd_class.map(s => [s.kind, s.v]), [["mult", 0.08], ["flat", 0.08]]);
});
