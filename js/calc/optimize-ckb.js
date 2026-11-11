// 크극 최적화: 크리티컬·극대화·보스 데미지 소켓을 어떻게 나누면 DPS가 최대인가.

import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "./diminish.js";
import { NO_PASSIVE, resolve, critFinal, maxiFinal, critFactor, maxiFactor } from "./stats.js";
import { CRIT_MAXI_PER_SLOT } from "../data/stones.js";

const STEP = 0.001;   // 소켓 수치 0.1% 단위로 탐색

/**
 * 크리·극대 마법석 한 칸(6%)과 보뎀 마법석 한 칸(bossPer)을 같은 값으로 보고,
 * 지금 가진 소켓 수치의 총량을 유지하면서 세 스탯에 다시 나눈 모든 경우를 계산해 가장 좋은 배분을 고른다.
 *
 * 크리 배율은 크리 수치에만, 극대 배율은 극대 수치에만 달려 있어서 각각 미리 표로 만들어 두면
 * 두 겹 반복문(약 200만 가지)도 곱셈만으로 끝난다.
 *
 * opt: { bossPer: 보뎀 한 칸 수치, minCrit: 이 아래로는 내리지 않을 크리 소켓 수치 }
 * 반환의 dCrit·dMaxi·dBoss는 바꿔야 하는 소켓 수치(점감 전), crit·maxi·boss는 그때의 스탯창 값.
 */
export function optimizeCkb(win, job, critResist, setup, opt) {
  const c = job || NO_PASSIVE;
  const rate = CRIT_MAXI_PER_SLOT / opt.bossPer;        // 보뎀 1%가 크리·극대 몇 %와 같은 값인지
  const sc0 = statFromCrit(win.crit), sm0 = statFromMaxi(win.maxi), b0 = win.boss;
  const pool = sc0 + sm0 + rate * b0;                   // 나눠 쓸 수 있는 총량 (크리·극대 수치 기준)
  const bossFixed = setup.guild_boss + c.boss;
  const bossMin = Math.min(b0, 0.6);                    // 장비 고유 보뎀 등 소켓이 아닌 몫은 남겨 둔다
  const iMin = Math.max(0, Math.ceil(Math.min(sc0, opt.minCrit || 0) / STEP - 1e-9));
  // 최종 확률이 100%에 닿은 뒤로는 더 넣어도 의미가 없으므로 거기까지만 본다
  const iMax = Math.max(iMin, Math.ceil((1.4 - setup.town_crit - c.crit_s) / STEP));
  const jMax = Math.max(0, Math.ceil((1.6 - setup.town_maxi - c.maxi_s) / STEP));

  const critTable = new Float64Array(iMax + 1), maxiTable = new Float64Array(jMax + 1);
  for (let i = iMin; i <= iMax; i++) critTable[i] = critFactor(win, job, critResist, setup, critFromStat(i * STEP));
  for (let j = 0; j <= jMax; j++) maxiTable[j] = maxiFactor(win, job, critResist, setup, maxiFromStat(j * STEP));

  const current = critFactor(win, job, critResist, setup, win.crit) * maxiFactor(win, job, critResist, setup, win.maxi) * (1 + bossFixed + b0);
  // 지금 배분에서 출발. 차이가 사실상 없으면 지금 배분을 그대로 둔다
  let best = { value: current * (1 + 1e-9), sc: sc0, sm: sm0, boss: b0 };
  for (let i = iMin; i <= iMax; i++) {
    const rest = pool - i * STEP, fc = critTable[i];
    for (let j = 0; j <= jMax; j++) {
      const boss = (rest - j * STEP) / rate;
      if (boss < bossMin) break;                        // 극대에 더 넣을수록 보뎀이 줄어드므로 여기서 끝
      const value = fc * maxiTable[j] * (1 + bossFixed + boss);
      if (value > best.value) best = { value, sc: i * STEP, sm: j * STEP, boss };
    }
  }

  const crit = critFromStat(best.sc), maxi = maxiFromStat(best.sm);
  const after = resolve(Object.assign({}, win, { crit, maxi, boss: best.boss }), job, critResist, setup);
  return {
    crit, maxi, boss: best.boss,
    dCrit: best.sc - sc0, dMaxi: best.sm - sm0, dBoss: best.boss - b0,
    gain: Math.max(0, best.value / current - 1),
    critFinal: critFinal(after), maxiFinal: maxiFinal(after),
  };
}
