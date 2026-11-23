import { test } from "node:test";
import assert from "node:assert/strict";
import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "../js/calc/diminish.js";
import { critFactor, maxiFactor, preShares } from "../js/calc/stats.js";
import { optimizeCkb } from "../js/calc/optimize-ckb.js";
import { optimizeSockets } from "../js/calc/optimize-sockets.js";
import { CLASS } from "../js/data/classes.js";
import { near, NISHA, PICARO } from "./helpers.js";

const PER = { crit: 0.06, maxi: 0.06, boss: 0.03, all: 0.02, cho: 0.025, gang: 0.025, both: 0.02 };

test("크극 최적화: 시트 Main 예시와 같은 답 (크리 83.00%, 극대 65.88%, DPS +0.57%)", () => {
  const { win, job, resist, setup } = NISHA;
  const r = optimizeCkb(win, job, resist, setup, { bossPer: 0.025, minCrit: 0.25 });
  near(r.crit, 0.8300); near(r.maxi, 0.6588, 3); near(r.gain, 0.0057, 4);
  near(r.dCrit, -0.055, 3); near(r.dMaxi, -0.040, 3);
  near(r.boss, 2.0304, 3);     // 시트 203.04% (시트는 0.1% 격자로 내림)
});

// 시트 ver.3.0.19 '크리·극대·보뎀 최적화'(Main S9) 식을 그대로 옮긴 것: 크리·극대를 0.1% 단위로 전부 나눠 보고 남은 만큼 보뎀.
// 보뎀 배율의 고정 몫은 길드·전직·마을 버프 보뎀이다. 크리 최소·보뎀 하한은 없다.
function sheetCkb(win, job, resist, setup, ratio) {
  const step = 0.001, budget = statFromCrit(win.crit) + statFromMaxi(win.maxi) + win.boss / ratio, units = Math.floor(budget / step + 1e-9);
  const fixed = 1 + setup.guild_boss + job.boss + (setup.town_boss || 0);
  const M = [];
  for (let j = 0; j <= Math.min(1600, units); j++) M[j] = maxiFactor(win, job, resist, setup, maxiFromStat(j * step));
  const base = critFactor(win, job, resist, setup, win.crit) * maxiFactor(win, job, resist, setup, win.maxi) * (fixed + win.boss);
  let best = { v: base, i: null, j: null };
  for (let i = 0; i <= Math.min(1400, units); i++) {
    const c = critFactor(win, job, resist, setup, critFromStat(i * step));
    for (let j = 0; j <= Math.min(1600, units - i); j++) {
      const v = c * M[j] * (fixed + Math.max(0, budget - step * (i + j)) * ratio);
      if (v > best.v * (1 + 1e-12)) best = { v, i, j };
    }
  }
  return { crit: critFromStat(best.i * step), maxi: maxiFromStat(best.j * step), boss: (budget - step * (best.i + best.j)) * ratio, gain: best.v / base - 1 };
}

test("크극 최적화: 크극 스텟 합연 +20% 전직(리버레이터·라디언트 소울)도 시트 식과 같은 답 (마을 버프 보뎀 포함)", () => {
  const { win, resist } = PICARO, setup = { ...PICARO.setup, town_boss: 0.02 };   // 엘 하우스(강화) 보뎀 2%
  for (const name of ["리버레이터", "라디언트 소울"]) for (const bossPer of [0.03, 0.025]) {
    const job = CLASS[name], r = optimizeCkb(win, job, resist, setup, { bossPer, minCrit: 0.25 }), s = sheetCkb(win, job, resist, setup, bossPer / 0.06);
    near(r.crit, s.crit, 9); near(r.maxi, s.maxi, 9); near(r.boss, s.boss, 9); near(r.gain, s.gain, 12);
  }
});

// 시트 S9 의 극대 찾기 그대로: 크리마다 2^10, 2^9, ..., 1칸 점프로 극대 점수의 꼭짓점을 찾는다
function sheetCkbJump(win, job, resist, setup, ratio) {
  const step = 0.001, budget = statFromCrit(win.crit) + statFromMaxi(win.maxi) + win.boss / ratio, units = Math.floor(budget / step + 1e-9);
  const fixed = 1 + setup.guild_boss + job.boss + (setup.town_boss || 0), maxcap = Math.min(1600, units);
  const M = [];
  for (let j = 0; j <= maxcap; j++) M[j] = maxiFactor(win, job, resist, setup, maxiFromStat(j * step));
  const bossOf = used => fixed + Math.max(0, budget - step * used) * ratio;
  const base = critFactor(win, job, resist, setup, win.crit) * maxiFactor(win, job, resist, setup, win.maxi) * (fixed + win.boss);
  let best = -Infinity;
  for (let i = 0; i <= Math.min(1400, units); i++) {
    const limit = Math.min(maxcap, units - i), score = j => M[j] * bossOf(i + j);
    let found = 0;
    for (let jump = 1024; jump >= 1; jump /= 2) { const t = found + jump; if (t <= limit && score(t) > score(t - 1)) found = t; }
    best = Math.max(best, critFactor(win, job, resist, setup, critFromStat(i * step)) * score(found));
  }
  return { gain: Math.max(0, best / base - 1) };
}

test("크극 최적화: 여러 전직·스탯·보뎀(낮은 보뎀 포함)·초목에서 시트 식과 같은 답이고, 시트의 극대 점프 찾기보다 낮지 않다", () => {
  const { resist } = PICARO;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const names = ["트윈즈 피카로", "리버레이터", "나이트 엠퍼러", "블러디 퀸", "템페스트 버스터", "임모탈"];
  for (let k = 0; k < 12; k++) {
    const job = CLASS[names[k % names.length]], ratio = k % 2 ? 0.5 : 2.5 / 6;
    const win = { ...PICARO.win, crit: 0.55 + 0.4 * rnd(), maxi: 0.45 + 0.45 * rnd(), boss: 0.6 + 1.6 * rnd(), crit_dmg: 1.6 + 0.6 * rnd() };
    const setup = { ...PICARO.setup, cd_base_mults: PICARO.setup.cd_base_mults.concat(k % 3 === 0 ? [0.30] : []) };   // 셋에 하나는 초목
    const r = optimizeCkb(win, job, resist, setup, { bossPer: ratio * 0.06, minCrit: 0 });
    const s = sheetCkb(win, job, resist, setup, ratio), jmp = sheetCkbJump(win, job, resist, setup, ratio);
    near(r.gain, s.gain, 12); near(r.crit, s.crit, 9); near(r.maxi, s.maxi, 9); near(r.boss, s.boss, 9);
    assert.ok(r.gain >= jmp.gain - 1e-12, `${job.name}: ${r.gain} < ${jmp.gain}`);
  }
});

test("크극·소켓 최적화: 마을 버프 보뎀은 길드 보뎀처럼 고정 몫으로 들어간다", () => {
  const { win, job, resist } = PICARO;
  const town = { ...PICARO.setup, town_boss: 0.02 }, guild = { ...PICARO.setup, guild_boss: PICARO.setup.guild_boss + 0.02 };
  const a = optimizeCkb(win, job, resist, town, { bossPer: 0.03, minCrit: 0.25 }), b = optimizeCkb(win, job, resist, guild, { bossPer: 0.03, minCrit: 0.25 });
  near(a.boss, b.boss, 12); near(a.gain, b.gain, 12);
  const w = { ...win, all_skill: 1.28 }, sa = optimizeSockets(w, job, resist, town, 8, PER, {}), sb = optimizeSockets(w, job, resist, guild, 8, PER, {});
  assert.deepEqual(sa.counts, sb.counts); near(sa.gain, sb.gain, 12);
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

// 모든 조합을 하나씩 세는 느린 방법. 동적 계획법 결과가 이것과 같아야 한다.
// limits: 종류별 최대 칸 수 (없으면 제한 없음)
function bruteForce(win, job, resist, setup, slots, cur, limits = {}) {
  const [Rg, Rc] = preShares(win.share_gang, win.share_cho, win.gang, win.cho);
  const bossFixed = setup.guild_boss + job.boss + (setup.town_boss || 0);
  const value = (n, removed) =>
    critFactor(win, job, resist, setup, critFromStat(statFromCrit(win.crit) - (removed.crit || 0) + n.crit * PER.crit)) *
    maxiFactor(win, job, resist, setup, maxiFromStat(statFromMaxi(win.maxi) - (removed.maxi || 0) + n.maxi * PER.maxi)) *
    (1 + bossFixed + win.boss - (removed.boss || 0) + n.boss * PER.boss) *
    (1 + win.all_skill - (removed.all || 0) + n.all * PER.all) *
    (Rc * (1 + win.cho - (removed.cho || 0) + n.cho * PER.cho + n.both * PER.both) + Rg * (1 + win.gang - (removed.gang || 0) + n.gang * PER.gang + n.both * PER.both));
  const keys = Object.keys(PER);
  let best = -1;
  const walk = (i, left, n) => {
    const max = limits[keys[i]] == null ? Infinity : limits[keys[i]];
    if (i === keys.length - 1) { if (left <= max) { n[keys[i]] = left; best = Math.max(best, value(n, cur)); } return; }
    for (let k = 0; k <= Math.min(left, max); k++) { n[keys[i]] = k; walk(i + 1, left - k, n); }
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

test("소켓 최적화: 종류별 한도를 걸어도 직접 센 결과와 같다 (아트마 마법석을 새로 안 끼우는 경우)", () => {
  const { job, resist, setup } = PICARO;
  const win = { ...PICARO.win, all_skill: 1.28 };
  const cases = [
    // 지금 초스뎀 3칸·유강강초 2칸이 끼워져 있고, 그 이상은 못 늘린다
    [10, { crit: 0.12, cho: 3 * 0.025 + 2 * 0.02, gang: 2 * 0.02 }, { all: 0, cho: 3, gang: 0, both: 2 }],
    // 아트마 마법석이 하나도 없는 경우: 크리·극대·보뎀만 쓴다
    [8, { crit: 0.24, maxi: 0.12 }, { all: 0, cho: 0, gang: 0, both: 0 }],
    [12, {}, { all: 1, cho: 0, gang: 4, both: 0 }],
  ];
  for (const [slots, cur, limits] of cases) {
    const r = optimizeSockets(win, job, resist, setup, slots, PER, cur, limits);
    near(r.gain, bruteForce(win, job, resist, setup, slots, cur, limits), 9);
    for (const [k, max] of Object.entries(limits)) assert.ok(r.counts[k] <= max, `${k} ${r.counts[k]}칸 > 한도 ${max}`);
  }
});

test("소켓 최적화: 한도 때문에 채울 수 있는 종류가 없으면 칸을 남긴다", () => {
  const { job, resist, setup } = PICARO;
  const r = optimizeSockets({ boss: 1.9, cho: 1.3, gang: 1.0, share_cho: 100, share_gang: 0 }, job, resist, setup, 6, { cho: 0.025 }, {}, { cho: 2 });
  assert.equal(r.counts.cho, 2); assert.equal(r.used, 2);
});

test("소켓 최적화: 후보에서 뺀 마법석(한 칸 수치 0)은 쓰지 않는다", () => {
  const { job, resist, setup } = PICARO;
  const r = optimizeSockets({ ...PICARO.win, all_skill: 1.28 }, job, resist, setup, 5, { ...PER, boss: 0, cho: 0 }, {});
  assert.equal(r.counts.boss, 0); assert.equal(r.counts.cho, 0);
});
