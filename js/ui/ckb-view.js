// "크극 최적화" 탭.

import { $, fmt, signed, arrowCells, pctOrZero } from "./dom.js";
import { has, hasCrit, hasMaxi } from "../calc/stats.js";
import { optimizeCkb } from "../calc/optimize-ckb.js";

export function renderCkb({ job, resist, win, setup }) {
  const out = $("ckb-out");
  if (!(hasCrit(win) && hasMaxi(win) && has(win, "boss"))) {
    out.innerHTML = `<p class="warn">크리티컬 확률·데미지, 극대화, 공격력, 최댓값, 보스 데미지를 모두 입력해야 계산할 수 있어요.</p>`;
    return;
  }
  const bossPer = parseFloat($("ckb_boss").value) / 100, minCrit = pctOrZero("ckb_min");
  const r = optimizeCkb(win, job, resist, setup, { bossPer, minCrit });

  const moves = [["크리", r.dCrit], ["극대", r.dMaxi], ["보뎀", r.dBoss]].filter(m => Math.abs(m[1]) >= 0.0005);
  const verdict = r.gain < 0.0005 || !moves.length
    ? `지금 크리·극대·보뎀 배분이 이미 최적에 가까워요. 옮겨도 DPS가 ${signed(r.gain)}밖에 안 달라져요.`
    : `소켓 수치를 ${moves.map(m => `${m[0]} ${signed(m[1], 1)}`).join(", ")}로 옮기면 DPS가 <b>${signed(r.gain)}</b> 올라요.`;
  const row = (name, a, b, d) => `<tr><td class="name">${name}</td>${arrowCells(a, b)}<td class="num">${Math.abs(d) < 0.0005 ? "-" : signed(d, 1)}</td></tr>`;
  out.innerHTML = `<p class="verdict">${verdict}</p>
      <div class="tbl-wrap"><table><thead><tr><th>스탯창</th><th class="num">현재</th><th class="num">최적</th><th class="num">바꿀 소켓 수치</th></tr></thead><tbody>
      ${row("크리티컬 확률", win.crit, r.crit, r.dCrit)}${row("극대화", win.maxi, r.maxi, r.dMaxi)}${row("보스 데미지", win.boss, r.boss, r.dBoss)}
      </tbody></table></div>
      <ul class="assume">
        <li>크리·극대 소켓 6%와 보뎀 소켓 ${(bossPer * 100).toFixed(1)}%를 같은 한 칸으로 보고, 0.1% 단위로 전부 계산해서 고른 값이에요</li>
        <li>"바꿀 소켓 수치"는 마법석에 적힌 수치 기준이에요. 스탯창 숫자는 점감 때문에 그보다 덜 움직여요</li>
        <li>최적 배분에서 실전 평균 크확 ${fmt(r.critFinal, 1)}, 최종 극대화 ${fmt(r.maxiFinal, 1)}</li>
        <li>크리티컬은 소켓 수치 ${(minCrit * 100).toFixed(0)}% 아래로는 내리지 않았어요 (장비 고유 옵션처럼 못 빼는 양)</li>
      </ul>`;
}
