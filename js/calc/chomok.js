// 초목 효율: 크뎀 곱연산 30%를 얻고 보뎀 마법석 한 칸을 뺐을 때의 DPS 상승률.

import { CHOMOK_CRIT_DAMAGE } from "../data/items.js";
import { STONES } from "../data/stones.js";
import { resolve, dpsIndex, has, hasCrit } from "./stats.js";

const stonePercent = key => STONES.find(s => s.key === key).percent / 100;

/**
 * 반환: { hunt: 사냥석 한 칸을 뺐을 때, atma: 힘트마 한 칸을 뺐을 때 } (0.1966 = +19.66%)
 * 크리티컬 확률·크리티컬 데미지·보스 데미지가 비어 있으면 null
 */
export function chomokGain(win, job, critResist, setup) {
  if (!hasCrit(win) || !has(win, "boss")) return null;
  const before = dpsIndex(resolve(win, job, critResist, setup));
  // 크뎀 곱연산은 파티 크뎀 버프와 같은 자리(기본 크뎀 곱연산)에 들어간다
  const withCd = { ...setup, cd_base_mults: setup.cd_base_mults.concat([CHOMOK_CRIT_DAMAGE]) };
  const gain = bossLoss => dpsIndex(resolve({ ...win, boss: win.boss - bossLoss }, job, critResist, withCd)) / before - 1;
  return { hunt: gain(stonePercent("boss2")), atma: gain(stonePercent("boss")) };
}
