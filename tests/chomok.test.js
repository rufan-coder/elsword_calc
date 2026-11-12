import { test } from "node:test";
import assert from "node:assert/strict";
import { CLASS } from "../js/data/classes.js";
import { buildSetup } from "../js/calc/buffs.js";
import { chomokGain } from "../js/calc/chomok.js";
import { critFactor } from "../js/calc/stats.js";
import { near, PICARO } from "./helpers.js";

// 화면 기본값(트윈즈 피카로, 온천, 하의·신발 11강, 황색, 원석 쿨감 30%, 네블론)
const { setup } = buildSetup({ town: "온천 버프", pantsEnhance: 11, shoesEnhance: 11, yellow: true, stoneCdr: 0.30, stoneDur: 0 });
const win = { crit: 0.83, crit_dmg: 1.994, maxi: 0.6512, A: 124266, A_max: 169166, W: 44020, boss: 1.90, all_skill: 1.275, cho: 1.301, gang: 1.001, share_cho: 95, share_gang: 5 };

test("초목 효율: 사냥석 / 힘트마 한 칸을 뺐을 때 DPS 상승률", () => {
  const g = chomokGain(win, CLASS["트윈즈 피카로"], 0.30, setup);
  near(g.hunt, 0.1966);
  near(g.atma, 0.1946);
});

test("초목 효율: 보뎀 손실을 빼면 크리티컬 배율 비율과 같다", () => {
  const { job, resist, win: w, setup: s } = PICARO;
  const g = chomokGain({ ...w, boss: 0 }, job, resist, s);   // 보뎀 0 -> 보뎀 손실 효과만 따로 확인
  const cd = critFactor(w, job, resist, { ...s, cd_base_mults: s.cd_base_mults.concat([0.30]) }, w.crit) / critFactor(w, job, resist, s, w.crit) - 1;
  const boss = b => (1 + b + s.guild_boss + job.boss);
  near(g.hunt, (1 + cd) * boss(-0.025) / boss(0) - 1, 8);
  near(g.atma, (1 + cd) * boss(-0.03) / boss(0) - 1, 8);
});

test("초목 효율: 크리티컬이나 보뎀이 비어 있으면 계산하지 않는다", () => {
  assert.equal(chomokGain({ ...win, boss: null }, CLASS["트윈즈 피카로"], 0.30, setup), null);
  assert.equal(chomokGain({ ...win, crit_dmg: null }, CLASS["트윈즈 피카로"], 0.30, setup), null);
});
