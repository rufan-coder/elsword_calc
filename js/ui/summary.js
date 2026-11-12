// 입력 옆의 안내 문구와 "실전 수치" 타일.

import { $, fmt, trimPct } from "./dom.js";
import { CLASS_NOTES } from "../data/classes.js";
import { has, hasCrit, hasMaxi, critFinal, maxiFinal, adaptFinal, POLAR_CAP } from "../calc/stats.js";
import { ADAPT_CAP, CDR_CAP } from "../data/rules.js";
import { chomokGain } from "../calc/chomok.js";
import { capOver, CAP_NOTES } from "../calc/caps.js";

function passiveText(stat, mult, add) {
  const parts = [];
  if (stat) parts.push(`스텟 +${Math.round(stat * 100)}%`);
  if (mult) parts.push(`곱연산 ${Math.round(mult * 100)}%`);
  if (add) parts.push(`최종 +${Math.round(add * 100)}%`);
  return parts.join(" · ") || "없음";
}
const short = x => (x * 100).toFixed(1).replace(/\.0$/, "");
/** 상한을 넘은 양을 빨간 글씨로 */
const overText = (v, k, prefix = "") => `<span class="over" title="${CAP_NOTES[k]}">${prefix}${trimPct(v)} 초과</span>`;

export function renderSummary({ cls, job, resist, win, base, setup, buffs }) {
  // 전직·던전 안내
  $("field-info").textContent = `· 크리저항 ${Math.round(resist * 100)}% · 마계 디버프 ${Math.round((setup.debuff || 0) * 100)}%`;
  $("cls-info").textContent = `${job.type} · 공격력 ${job.tier}티어 · 패시브: 크확 ${passiveText(job.crit_s, job.crit_m, job.crit_a)}, 극대 ${passiveText(job.maxi_s, job.maxi_m, job.maxi_a)}, 크뎀 +${short(job.cd_s)}%` + (job.boss ? `, 보뎀 +${short(job.boss)}%` : "");
  $("cls-extra").hidden = !CLASS_NOTES[cls]; $("cls-extra").textContent = CLASS_NOTES[cls] || "";

  // 버프 세팅이 실제로 어떤 수치로 들어갔는지
  const { town, pants, shoes, yellow, enc } = buffs;
  const townParts = [["크리", town.crit], ["극대", town.maxi], ["적응력", town.adapt], ["보뎀", town.boss]].filter(t => t[1]).map(t => `${t[0]} +${trimPct(t[1])}`);
  $("setup-info").textContent = `적용 값 · 마을 버프 ${townParts.join(" ") || "없음"} · 하의 크확 ×${trimPct(pants)} · 신발 극대 ×${trimPct(shoes)}` + (yellow ? " · 황색 크극 ×8%" : "") +
    ` · 격려 가동률 ${(enc.uptime * 100).toFixed(1)}% (쿨 ${Math.round(enc.cool)}초, 지속 ${Math.round(enc.dur)}초)`;

  // 실전 수치. 상한을 넘은 스탯은 넘은 만큼을 빨간 글씨로 붙인다
  const over = capOver(win, setup, job, resist);
  const tiles = [];
  if (hasCrit(base)) {
    tiles.push(["평균 크리티컬 확률", fmt(critFinal(base), 1), `스탯창 ${fmt(win.crit, 1)}` + (over.crit ? ` · ${overText(over.crit, "crit")}` : "")]);
    tiles.push(["크리티컬 데미지", fmt(base.crit_dmg, 1), `스탯창 ${fmt(win.crit_dmg, 1)}`]);
  }
  if (hasMaxi(base)) tiles.push(["최종 극대화", fmt(maxiFinal(base), 1), `스탯창 ${fmt(win.maxi, 1)}` + (over.maxi ? ` · ${overText(over.maxi, "maxi")}` : "")]);
  if (has(win, "atk_pct")) tiles.push(["공격력 % (스텟)", fmt(win.atk_pct, 2), win.atk_pct < 0 ? "값을 확인하세요" : "무기 공격력으로 역산"]);
  // 적응력: 디버프를 얼마나 막았는지. 적응력이 상한이면 초적응력만 의미가 있다
  if (has(base, "adapt")) {
    const fin = adaptFinal(base), left = (base.debuff || 0) - fin, capped = base.adapt + (base.adapt_add || 0) >= ADAPT_CAP;
    tiles.push(["최종 적응력", fmt(fin, 1), (left > 0 ? `남은 디버프 ${trimPct(left)}` : "디버프 모두 막음") + (over.adapt ? ` · ${overText(over.adapt, "adapt", "적응력 ")}` : capped ? " · 적응력 상한" : ""), "",
      `마계 디버프 ${trimPct(base.debuff || 0)} 중 적응력으로 못 막은 만큼 데미지가 줄어요. 적응력은 60%까지, 초적응력은 그 위에 더해져요.`]);
  }
  // 재사용 시간 감소: 상한 35%까지 얼마나 남았는지
  if (has(base, "cdr_gang") || has(base, "cdr_cho")) {
    const g = base.cdr_gang || 0, c = base.cdr_cho || 0, room = x => trimPct(Math.max(0, CDR_CAP - x));
    const side = (x, k) => over[k] ? overText(over[k], k) : `${room(x)} 남음`;
    tiles.push(["쿨감 (강렬/초월)", `${trimPct(g)}/${trimPct(c)}`, over.cdr_gang || over.cdr_cho ? `${side(g, "cdr_gang")} / ${side(c, "cdr_cho")}` : `상한까지 ${room(g)} / ${room(c)}`, "",
      "강렬·초월 스킬 재사용 시간 감소. 35%까지만 적용돼요. DPS 계산에는 넣지 않아요."]);
  }
  // 양극화: 상한(60%)을 넘었을 때만 보여 준다
  if (over.polar) tiles.push(["양극화", fmt(POLAR_CAP, 1), `스탯창 ${fmt(win.polar, 1)} · ${overText(over.polar, "polar")}`, "", CAP_NOTES.polar]);
  // 초목: 크뎀 곱연산 30%를 얻고 보뎀 한 칸을 뺐을 때. "사냥석 뺀 기준/힘트마 뺀 기준"
  const chomok = chomokGain(win, job, resist, setup);
  if (chomok) tiles.push(["초목 효율", `${fmt(chomok.hunt)}/${fmt(chomok.atma)}`, "사냥석 -> 크리 +6% / 힘트마 -> 크리 +6%", "chomok",
    "크뎀 곱연산 30%를 얻고 보뎀 사냥석(2.5%) 또는 힘트마(3%) 한 칸을 뺐을 때의 DPS 상승률"]);
  $("tiles").innerHTML = tiles.length
    ? tiles.map(t => `<div class="tile${t[3] ? " " + t[3] : ""}"${t[4] ? ` title="${t[4]}"` : ""}><div class="k">${t[0]}</div><div class="v">${t[1]}</div><div class="from">${t[2]}</div></div>`).join("")
    : `<p class="hint">스탯창 값을 입력하면 버프와 패시브가 반영된 수치가 여기에 나와요.</p>`;
}
