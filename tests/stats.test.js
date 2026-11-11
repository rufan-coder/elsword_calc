import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, critFinal, maxiFinal, critFactor, maxiFactor, statAtkPct, dpsIndex } from "../js/calc/stats.js";
import { encourage, engrave, buildSetup } from "../js/calc/buffs.js";
import { near, NISHA, PICARO } from "./helpers.js";

test("실전 수치: 시트 2.21.1의 트윈즈 피카로와 일치", () => {
  const s = resolve(PICARO.win, PICARO.job, PICARO.resist, PICARO.setup);
  near(critFinal(s), 0.9543);     // 격려 포함 평균 크리티컬 확률
  near(maxiFinal(s), 0.9902);     // 최종 극대화
  near(s.crit_dmg, 2.3615);       // 총 크리티컬 데미지
  near(s.boss, 1.925);            // 스탯창 190% + 길드 2.5%
});

test("실전 수치: 시트 2.21.4의 니샤 라비린스와 일치", () => {
  const { win, job, resist, setup } = NISHA;
  near(critFactor(win, job, resist, setup, win.crit), 2.3319);   // 시트 "크리티컬 관련 최종데미지" 233.19%
  near(maxiFactor(win, job, resist, setup, win.maxi), 1.3669);   // 시트 "극대화 관련 최종데미지" 36.69%
});

test("공격력 %: 시트의 물리 공격력 %(스텟) 80.4%", () => {
  near(statAtkPct(NISHA.win.A, NISHA.win.A_max, NISHA.win.W), 0.804, 3);
});

test("격려 가동률: 원석 재사용 시간 감소 30%면 쿨 66초·지속 36초", () => {
  const e = encourage(0.30, 0);
  near(e.cool, 66); near(e.dur, 36); near(e.uptime, 0.5455);
  assert.equal(encourage(0.9, 5).uptime, 1);     // 100%를 넘지 않는다
});

test("각인석: 수치 x 가동률(21.25%), 같은 옵션은 평균", () => {
  const e = engrave([{ kind: "patk", value: 0.05 }, { kind: "cd", value: 0.06 }, { kind: "skill", value: 0.05 }]);
  near(e.patk, 0.010625, 6); near(e.cd, 0.01275, 6); near(e.skill, 0.010625, 6);
  assert.equal(e.boss, 0);
  near(engrave([{ kind: "cd", value: 0.06 }, { kind: "cd", value: 0.04 }]).cd, 0.010625, 6);
});

test("버프 세팅 만들기: 강화 수치는 (2 + 강화)%", () => {
  const { setup } = buildSetup({ town: "온천 버프", pantsEnhance: 11, shoesEnhance: 9, yellow: true, engraveRows: [{ kind: "boss", value: 0.04 }], stoneCdr: 0.30, stoneDur: 0 });
  assert.deepEqual(setup.crit_mults, [0.13, 0.08]);
  assert.deepEqual(setup.maxi_mults, [0.11, 0.08]);
  near(setup.guild_boss, 0.025 + 0.04 * 0.2125, 6);     // 길드 + 각인석 보뎀
  near(setup.enc_uptime, 0.5455);
  assert.equal(buildSetup({ town: "미사용", yellow: false }).setup.town_crit, 0);
});

test("크리저항만큼 최종 크리티컬 확률이 깎인다", () => {
  const a = critFinal(resolve({ crit: 0.5, crit_dmg: 2 }, null, 0.0, { ...PICARO.setup, enc_uptime: 0 }));
  const b = critFinal(resolve({ crit: 0.5, crit_dmg: 2 }, null, 0.3, { ...PICARO.setup, enc_uptime: 0 }));
  near(a - b, 0.3);
});

test("비어 있는 스탯은 DPS 지수에 영향을 주지 않는다", () => {
  near(dpsIndex({}), 1);
  near(dpsIndex({ boss: 1.0 }), 2);
  near(dpsIndex({ polar: 0.9 }), 1.6);     // 양극화는 60%까지만
});
