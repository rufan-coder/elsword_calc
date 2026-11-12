// 입력 옆의 안내 문구와 "실전 수치" 타일.

import { $, fmt, trimPct } from "./dom.js";
import { CLASS_NOTES } from "../data/classes.js";
import { has, hasCrit, hasMaxi, critFinal, maxiFinal } from "../calc/stats.js";

function passiveText(stat, mult, add) {
  const parts = [];
  if (stat) parts.push(`스텟 +${Math.round(stat * 100)}%`);
  if (mult) parts.push(`곱연산 ${Math.round(mult * 100)}%`);
  if (add) parts.push(`최종 +${Math.round(add * 100)}%`);
  return parts.join(" · ") || "없음";
}
const short = x => (x * 100).toFixed(1).replace(/\.0$/, "");

export function renderSummary({ cls, job, resist, win, base, buffs }) {
  // 전직·던전 안내
  $("field-info").textContent = `· 크리저항 ${Math.round(resist * 100)}%`;
  $("cls-info").textContent = `${job.type} · 공격력 ${job.tier}티어 · 패시브: 크확 ${passiveText(job.crit_s, job.crit_m, job.crit_a)}, 극대 ${passiveText(job.maxi_s, job.maxi_m, job.maxi_a)}, 크뎀 +${short(job.cd_s)}%` + (job.boss ? `, 보뎀 +${short(job.boss)}%` : "");
  $("cls-extra").hidden = !CLASS_NOTES[cls]; $("cls-extra").textContent = CLASS_NOTES[cls] || "";

  // 버프 세팅이 실제로 어떤 수치로 들어갔는지
  const { town, pants, shoes, yellow, enc } = buffs;
  $("setup-info").textContent = `적용 값 · 마을 버프 크리 +${trimPct(town.crit)} 극대 +${trimPct(town.maxi)} · 하의 크확 ×${trimPct(pants)} · 신발 극대 ×${trimPct(shoes)}` + (yellow ? " · 황색 크극 ×8%" : "") +
    ` · 격려 가동률 ${(enc.uptime * 100).toFixed(1)}% (쿨 ${Math.round(enc.cool)}초, 지속 ${Math.round(enc.dur)}초)`;

  // 실전 수치
  const tiles = [];
  if (hasCrit(base)) {
    tiles.push(["평균 크리티컬 확률", fmt(critFinal(base), 1), `스탯창 ${fmt(win.crit, 1)}`]);
    tiles.push(["크리티컬 데미지", fmt(base.crit_dmg, 1), `스탯창 ${fmt(win.crit_dmg, 1)}`]);
  }
  if (hasMaxi(base)) tiles.push(["최종 극대화", fmt(maxiFinal(base), 1), `스탯창 ${fmt(win.maxi, 1)}`]);
  if (has(base, "boss")) tiles.push(["보스 데미지", fmt(base.boss, 1), `스탯창 ${fmt(win.boss, 1)}`]);
  if (has(win, "atk_pct")) tiles.push(["공격력 % (스텟)", fmt(win.atk_pct, 2), win.atk_pct < 0 ? "값을 확인하세요" : "무기 공격력으로 역산"]);
  $("tiles").innerHTML = tiles.length
    ? tiles.map(t => `<div class="tile"><div class="k">${t[0]}</div><div class="v">${t[1]}</div><div class="from">${t[2]}</div></div>`).join("")
    : `<p class="hint">스탯창 값을 입력하면 버프와 패시브가 반영된 수치가 여기에 나와요.</p>`;
}
