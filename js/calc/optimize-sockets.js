// 소켓 최적화: 고른 칸을 비우고 마법석으로 다시 채울 때 가장 좋은 조합.

import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "./diminish.js";
import { NO_PASSIVE, has, hasCrit, hasMaxi, preShares, critFactor, maxiFactor } from "./stats.js";

const MAX_SLOTS = 60;

/**
 * slots칸을 7종 마법석으로 채우는 모든 조합 중 DPS가 가장 높은 것을 찾는다.
 *
 * DPS는 "크리 배율 x 극대 배율 x 보뎀 배율 x 모스뎀 배율 x 강렬·초월 배율"의 곱이고 각 배율은 자기 마법석 칸 수에만 달려 있다.
 * 그래서 스탯 묶음을 하나씩 추가하면서 "n칸을 지금까지의 묶음에 나눴을 때의 최대 곱"을 채워 나가면(동적 계획법)
 * 조합을 하나하나 세지 않고도 전수 탐색과 같은 답이 나온다.
 *
 * per : 한 칸 수치 { crit, maxi, boss, all, cho, gang, both }
 *       per.bossTiers 가 있으면 보뎀 마법석을 종류별로 쓴다: [{ key, value, limit }] (수치 높은 것부터 limit칸까지)
 * cur : 다시 배분할 칸에 지금 박혀 있어서 먼저 빼야 하는 수치의 합 { crit, maxi, boss, all, cho, gang }
 * limits : 종류별로 쓸 수 있는 최대 칸 수 { all, cho, gang, both }. 없으면 제한 없음, 0이면 그 종류는 아예 못 쓴다
 * 반환: { slots, used, counts: 종류별 칸 수, after: 채운 뒤 스탯창 값, gain: 지금 대비 DPS 상승률 }
 */
export function optimizeSockets(win, job, critResist, setup, slots, per, cur, limits = {}) {
  const c = job || NO_PASSIVE;
  const N = Math.max(0, Math.min(MAX_SLOTS, Math.floor(slots || 0)));
  const p = k => Math.max(0, per[k] || 0), q = k => Math.max(0, cur[k] || 0);
  const ok = { crit: hasCrit(win), maxi: hasMaxi(win), boss: has(win, "boss"), all: has(win, "all_skill"), skill: has(win, "cho") || has(win, "gang") };

  // 지금 박힌 수치를 뺀 바닥 값
  const bossFixed = setup.guild_boss + c.boss;
  const critStat = ok.crit ? Math.max(0, statFromCrit(win.crit) - q("crit")) : 0;
  const maxiStat = ok.maxi ? Math.max(0, statFromMaxi(win.maxi) - q("maxi")) : 0;
  const boss = Math.max(0, (win.boss || 0) - q("boss")), all = Math.max(0, (win.all_skill || 0) - q("all"));
  const gangNow = (win.gang || 0) + c.gang, choNow = (win.cho || 0) + c.cho;
  const [Rg, Rc] = preShares(win.share_gang || 0, win.share_cho == null ? 1 : win.share_cho, gangNow, choNow);
  const gang = Math.max(0, gangNow - q("gang")), cho = Math.max(0, choNow - q("cho"));

  const limitOf = k => (limits[k] == null ? Infinity : Math.max(0, limits[k]));

  // 한 묶음 안에 마법석 종류가 여럿일 때: 한 칸당 이득이 큰 종류부터 그 종류의 한도까지 채운다.
  // 배율이 칸 수에 대해 직선인 묶음(보뎀, 강렬·초월)에서는 이게 곧 최선이다.
  const ladder = kinds => {
    const tiers = kinds.filter(t => t.value > 0 && t.limit > 0).sort((x, y) => y.value - x.value);
    return {
      any: tiers.length > 0,
      cap: tiers.reduce((s, t) => s + t.limit, 0),
      split(n) {
        const out = {}; let add = 0;
        for (const t of tiers) { const k = Math.min(n, t.limit); out[t.key] = k; add += k * t.value; n -= k; }
        return { out, add };
      },
    };
  };
  // 보뎀: 힘트마·사냥석처럼 수치가 다른 종류 (지금 낀 더 좋은 마법석은 그대로 두는 경우를 limit으로 표현)
  const bossLadder = ladder(per.bossTiers || [{ key: "boss", value: p("boss"), limit: Infinity }]);
  // 강렬·초월: 초스뎀·강렬스뎀·유강강초. value는 강렬·초월 배율에 더해지는 한 칸당 이득
  const skillLadder = ladder([
    { key: "cho", value: Rc * p("cho"), limit: limitOf("cho") },
    { key: "gang", value: Rg * p("gang"), limit: limitOf("gang") },
    { key: "both", value: (Rc + Rg) * p("both"), limit: limitOf("both") },
  ]);

  // 스탯 묶음: on = 후보인지, fill(n) = n칸 채웠을 때 배율, now() = 지금 배율
  const groups = [
    { key: "crit", on: ok.crit && p("crit") > 0, fill: n => critFactor(win, job, critResist, setup, critFromStat(critStat + n * p("crit"))), now: () => critFactor(win, job, critResist, setup, win.crit) },
    { key: "maxi", on: ok.maxi && p("maxi") > 0, fill: n => maxiFactor(win, job, critResist, setup, maxiFromStat(maxiStat + n * p("maxi"))), now: () => maxiFactor(win, job, critResist, setup, win.maxi) },
    { key: "boss", on: ok.boss && bossLadder.any, cap: bossLadder.cap, fill: n => 1 + bossFixed + boss + bossLadder.split(n).add, now: () => 1 + bossFixed + win.boss },
    { key: "all", on: ok.all && p("all") > 0 && limitOf("all") > 0, cap: limitOf("all"), fill: n => 1 + all + n * p("all"), now: () => 1 + win.all_skill },
    { key: "skill", on: ok.skill && skillLadder.any, cap: skillLadder.cap, fill: n => Rc * (1 + cho) + Rg * (1 + gang) + skillLadder.split(n).add, now: () => Rc * (1 + choNow) + Rg * (1 + gangNow) },
  ];
  const have = { crit: ok.crit, maxi: ok.maxi, boss: ok.boss, all: ok.all, skill: ok.skill };
  let current = 1;
  for (const g of groups) if (have[g.key]) current *= g.now();

  // best[n] = n칸을 지금까지의 묶음에 나눴을 때의 최대 곱 (-1은 불가능)
  let best = new Float64Array(N + 1).fill(-1); best[0] = 1;
  const choice = [];   // choice[묶음][n] = 그때 이 묶음에 준 칸 수
  for (const g of groups) {
    const factor = new Float64Array(N + 1).fill(-1);
    for (let n = 0; n <= N; n++) {
      if (n > 0 && (!g.on || n > (g.cap == null ? Infinity : g.cap))) break;
      factor[n] = have[g.key] ? g.fill(n) : 1;
    }
    const next = new Float64Array(N + 1).fill(-1), pick = new Int32Array(N + 1);
    for (let n = 0; n <= N; n++) for (let k = 0; k <= n; k++) {
      if (factor[k] < 0 || best[n - k] < 0) continue;
      const value = best[n - k] * factor[k];
      if (value > next[n]) { next[n] = value; pick[n] = k; }
    }
    best = next; choice.push(pick);
  }

  // 채울 수 있는 가장 많은 칸에서 거꾸로 되짚어 묶음별 칸 수를 복원
  let used = N; while (used > 0 && best[used] < 0) used--;
  const counts = { crit: 0, maxi: 0, boss: 0, all: 0, cho: 0, gang: 0, both: 0 };
  for (const t of per.bossTiers || []) counts[t.key] = 0;
  let n = used, bossAdd = 0;
  for (let gi = groups.length - 1; gi >= 0; gi--) {
    const k = choice[gi][n]; n -= k;
    if (groups[gi].key === "skill") Object.assign(counts, skillLadder.split(k).out);
    else if (groups[gi].key === "boss") { const s = bossLadder.split(k); Object.assign(counts, s.out); bossAdd = s.add; }
    else counts[groups[gi].key] = k;
  }

  const after = {
    crit: ok.crit ? critFromStat(critStat + counts.crit * p("crit")) : null,
    maxi: ok.maxi ? maxiFromStat(maxiStat + counts.maxi * p("maxi")) : null,
    boss: ok.boss ? boss + bossAdd : null,
    all_skill: ok.all ? all + counts.all * p("all") : null,
    cho: ok.skill ? cho - c.cho + counts.cho * p("cho") + counts.both * p("both") : null,
    gang: ok.skill ? gang - c.gang + counts.gang * p("gang") + counts.both * p("both") : null,
  };
  return { slots: N, used, counts, after, gain: best[used] / current - 1 };
}
