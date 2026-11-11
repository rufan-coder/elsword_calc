import { test } from "node:test";
import assert from "node:assert/strict";
import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "../js/calc/diminish.js";
import { critFactor, maxiFactor, preShares } from "../js/calc/stats.js";
import { optimizeCkb } from "../js/calc/optimize-ckb.js";
import { optimizeSockets } from "../js/calc/optimize-sockets.js";
import { near, NISHA, PICARO } from "./helpers.js";

const PER = { crit: 0.06, maxi: 0.06, boss: 0.03, all: 0.02, cho: 0.025, gang: 0.025, both: 0.02 };

test("크극 최적화: 시트 Main 예시와 같은 답 (크리 83.00%, 극대 65.88%, DPS +0.57%)", () => {
  const { win, job, resist, setup } = NISHA;
  const r = optimizeCkb(win, job, resist, setup, { bossPer: 0.025, minCrit: 0.25 });
  near(r.crit, 0.8300); near(r.maxi, 0.6588, 3); near(r.gain, 0.0057, 4);
  near(r.dCrit, -0.055, 3); near(r.dMaxi, -0.040, 3);
  near(r.boss, 2.0304, 3);     // 시트 203.04% (시트는 0.1% 격자로 내림)
});

test("크극 최적화: 지금보다 나빠지는 답은 내지 않는다", () => {
  const { win, job, resist, setup } = PICARO;
  const r = optimizeCkb({ ...win, all_skill: 1.28 }, job, resist, setup, { bossPer: 0.025, minCrit: 0.25 });
  assert.ok(r.gain >= 0);
  assert.ok(statFromCrit(r.crit) >= 0.25 - 1e-9);     // 최소 크리티컬 수치를 지킨다
});

test("소켓 한 칸의 가치: 시트의 '효율(상승배율)' 7개 값과 일치", () => {
  const { job, resist, setup } = NISHA;
  // 시트는 강렬:초월 비중을 스킬 데미지 적용 전 기준 15:85로 받는다 -> 화면이 받는 '보이는 비중'으로 바꿔 넣는다
  const seenCho = 0.85 * 2.296 / (0.85 * 2.296 + 0.15 * 1.986);
  const win = { ...NISHA.win, share_cho: seenCho * 100, share_gang: (1 - seenCho) * 100 };
  const expected = { crit: 1.007867, maxi: 1.000000, boss: 1.009947, all: 1.008639, cho: 1.009447, gang: 1.001667, both: 1.008891 };
  for (const [key, value] of Object.entries(expected)) {
    const r = optimizeSockets(win, job, resist, setup, 1, { [key]: PER[key] }, {});
    near(1 + r.gain, value, 6);
  }
});

// 모든 조합을 하나씩 세는 느린 방법. 동적 계획법 결과가 이것과 같아야 한다
function bruteForce(win, job, resist, setup, slots, cur) {
  const [Rg, Rc] = preShares(win.share_gang, win.share_cho, win.gang, win.cho);
  const bossFixed = setup.guild_boss + job.boss;
  const value = (n, removed) =>
    critFactor(win, job, resist, setup, critFromStat(statFromCrit(win.crit) - (removed.crit || 0) + n.crit * PER.crit)) *
    maxiFactor(win, job, resist, setup, maxiFromStat(statFromMaxi(win.maxi) - (removed.maxi || 0) + n.maxi * PER.maxi)) *
    (1 + bossFixed + win.boss - (removed.boss || 0) + n.boss * PER.boss) *
    (1 + win.all_skill + n.all * PER.all) *
    (Rc * (1 + win.cho - (removed.cho || 0) + n.cho * PER.cho + n.both * PER.both) + Rg * (1 + win.gang + n.gang * PER.gang + n.both * PER.both));
  const keys = Object.keys(PER);
  let best = -1;
  const walk = (i, left, n) => {
    if (i === keys.length - 1) { n[keys[i]] = left; best = Math.max(best, value(n, cur)); return; }
    for (let k = 0; k <= left; k++) { n[keys[i]] = k; walk(i + 1, left - k, n); }
  };
  walk(0, slots, {});
  return best / value({ crit: 0, maxi: 0, boss: 0, all: 0, cho: 0, gang: 0, both: 0 }, {}) - 1;
}

test("소켓 최적화: 모든 조합을 직접 센 결과와 같다", () => {
  const { job, resist, setup } = PICARO;
  const win = { ...PICARO.win, all_skill: 1.28 };
  for (const [slots, cur] of [[6, {}], [8, { crit: 0.12, maxi: 0.12, cho: 0.05 }], [12, { crit: 0.36, maxi: 0.30 }]]) {
    const r = optimizeSockets(win, job, resist, setup, slots, PER, cur);
    near(r.gain, bruteForce(win, job, resist, setup, slots, cur), 9);
    assert.equal(Object.values(r.counts).reduce((a, b) => a + b, 0), slots);     // 칸을 남기지 않는다
  }
});

test("소켓 최적화: 지금 낀 더 좋은 보뎀 마법석은 그대로 둔다 (사냥석 기준)", () => {
  const { job, resist, setup } = PICARO;
  const win = { ...PICARO.win, all_skill: 1.28 };
  const cur = { crit: 0.72, maxi: 0.48, boss: 4 * 0.03 + 4 * 0.025, cho: 0.20 };
  const per = { ...PER, bossTiers: [{ key: "boss2", value: 0.025, limit: Infinity }, { key: "boss", value: 0.03, limit: 4 }] };
  const r = optimizeSockets(win, job, resist, setup, 36, per, cur);
  assert.equal(r.counts.boss, 4);      // 힘트마 4칸은 유지
  assert.ok(r.gain >= 0);
});

test("소켓 최적화: 후보에서 뺀 마법석(한 칸 수치 0)은 쓰지 않는다", () => {
  const { job, resist, setup } = PICARO;
  const r = optimizeSockets({ ...PICARO.win, all_skill: 1.28 }, job, resist, setup, 5, { ...PER, boss: 0, cho: 0 }, {});
  assert.equal(r.counts.boss, 0); assert.equal(r.counts.cho, 0);
});
