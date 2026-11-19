// 동작 속도: 엘리오스 마이너 갤러리 "'동작속도' 스탯에 대한 정보"(2025.09)의 예시와 같은지.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aspdCalc, aspdBuffs } from "../js/calc/aspd.js";
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
