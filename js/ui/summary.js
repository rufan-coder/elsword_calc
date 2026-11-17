// 입력 옆의 안내 문구와 "실전 수치" 타일.

import { $, fmt, trimPct, esc } from "./dom.js";
import { CLASS, CLASS_NOTES, CLASS_SKILLS, PASSIVE_SOURCES } from "../data/classes.js";
import { has, hasCrit, hasMaxi, critFinal, maxiFinal, adaptFinal, POLAR_CAP } from "../calc/stats.js";
import { ADAPT_CAP } from "../data/rules.js";
import { chomokGain } from "../calc/chomok.js";
import { capOver, CAP_NOTES } from "../calc/caps.js";

function passiveText(stat, mult, add) {
  const parts = [];
  if (stat) parts.push(`스텟 +${Math.round(stat * 100)}%`);
  if (mult) parts.push(`곱연산 ${Math.round(mult * 100)}%`);
  if (add) parts.push(`최종 +${Math.round(add * 100)}%`);
  return parts.join(" · ") || "없음";
}
const short = x => (x * 100).toFixed(2).replace(/\.?0+$/, "");
/** 크뎀 패시브: 합연산 / 기본 크뎀 곱연산 / 크리 시 피해 */
function critDmgText(job) {
  const parts = [];
  if (job.cd_s) parts.push(`+${short(job.cd_s)}%`);
  if (job.cd_base) parts.push(`곱연산 ${short(job.cd_base)}%`);
  if (job.cd_final) parts.push(`크리 시 피해 ${short(job.cd_final)}%`);
  if (job.hp_crit_over || job.hp_crit_under) parts.push(`크리 시 피해 HP 50% 초과 ${short(job.hp_crit_over)}%·이하 ${short(job.hp_crit_under)}%`);
  return parts.join(" · ") || "없음";
}
/** 상한을 넘은 양을 빨간 글씨로 */
const overText = (v, k, prefix = "") => `<span class="over" title="${CAP_NOTES[k]}">${prefix}${trimPct(v)} 초과</span>`;

// 실전 수치가 어디서 왔는지 작은 글씨로: "스탯창 83% · 마을 +5% · 패시브 최종 +15% · 하의 ×13% ..."
const PARTS_NOTE = "+는 합연산, ×는 곱연산(크뎀은 기본 150%에만 곱해요), 최종은 최종 합연산이에요. 밑줄 친 항목에 마우스를 올리면 어떤 패시브인지 나와요.";
const plus = x => "+" + trimPct(x), times = x => "×" + trimPct(x), last = x => "최종 " + (x < 0 ? "−" : "+") + trimPct(Math.abs(x));
/** parts: [이름, 값 글자, 툴팁] 목록. 값이 0인 항목은 미리 빼고 넘긴다 */
function partsHtml(parts) {
  const items = parts.filter(Boolean).map(([label, value, tip]) => `<span${tip ? ` class="src" title="${esc(tip)}"` : ""}>${label} ${value}</span>`);
  return items.length ? `<div class="parts" title="${PARTS_NOTE}">${items.join(" · ")}</div>` : "";
}
/** 고른 선택 스킬: { name: "크리티컬 소드(일반)", o: 그 선택지의 효과(단위 %) } 또는 null */
function chosenSkill(cls, job) {
  const info = CLASS_SKILLS[cls];
  return info && job.skillChoice ? { name: `${info.skill}(${job.skillChoice})`, o: info.options[job.skillChoice] || {} } : null;
}
/** 크리·극대 실전 값의 출처 (계산 순서대로: 스텟 합연 -> 점감 -> 곱연 -> 최종 합연) */
function chanceParts(kind, { cls, job, win, setup, buffs, resist }) {
  const p = CLASS[cls] || job, tip = (PASSIVE_SOURCES[cls] || {})[kind], sk = chosenSkill(cls, job);
  const town = kind === "crit" ? setup.town_crit : setup.town_maxi, gear = kind === "crit" ? ["하의", buffs.pants] : ["신발", buffs.shoes];
  const skill = k => sk && sk.o[kind + k] ? [sk.name, (k === "_s" ? plus : times)(sk.o[kind + k] / 100)] : null;
  return [
    ["스탯창", trimPct(win[kind])],
    town ? ["마을", plus(town)] : null,
    p[kind + "_s"] ? ["패시브", plus(p[kind + "_s"]), tip] : null, skill("_s"),
    gear[1] ? [gear[0], times(gear[1])] : null, buffs.yellow ? ["황색", times(buffs.yellow)] : null,
    p[kind + "_m"] ? ["패시브", times(p[kind + "_m"]), tip] : null, skill("_m"),
    p[kind + "_a"] ? ["패시브", last(p[kind + "_a"]), tip] : null,
    kind === "crit" && resist ? ["크저", "−" + trimPct(resist)] : null,
    kind === "crit" && buffs.enc.uptime ? ["격려 가동률", trimPct(buffs.enc.uptime)] : null,
  ];
}
function critDmgParts({ cls, job, win, setup }) {
  const p = CLASS[cls] || job, tip = (PASSIVE_SOURCES[cls] || {}).crit_dmg, sk = chosenSkill(cls, job);
  return [
    ["스탯창", trimPct(win.crit_dmg)],
    p.cd_s ? ["패시브", plus(p.cd_s), tip] : null,
    ...(setup.cd_base_mults || []).filter(x => x).map((x, i) => [i === 0 ? "파티 버프" : "곱연", times(x)]),
    p.cd_base ? ["패시브", times(p.cd_base), tip] : null,
    sk && sk.o.cd_base ? [sk.name, times(sk.o.cd_base / 100)] : null,
    p.cd_final ? ["패시브 크리 시", times(p.cd_final), tip] : null,
    p.hp_crit_over || p.hp_crit_under ? ["갈증 크리 시", `×${trimPct(p.hp_crit_over)}/${trimPct(p.hp_crit_under)} (HP 50% 초과/이하, 위 값엔 미포함)`, tip] : null,
  ];
}

export function renderSummary(ctx) {
  const { cls, job, resist, win, base, setup, buffs } = ctx;
  // 전직·던전 안내
  $("field-info").textContent = `· 크리저항 ${Math.round(resist * 100)}% · 마계 디버프 ${Math.round((setup.debuff || 0) * 100)}%`;
  $("cls-info").textContent = `${job.type} · 공격력 ${job.tier}티어 · 패시브: 크확 ${passiveText(job.crit_s, job.crit_m, job.crit_a)}, 극대 ${passiveText(job.maxi_s, job.maxi_m, job.maxi_a)}, 크뎀 ${critDmgText(job)}` +
    (job.boss ? `, 보뎀 +${short(job.boss)}%` : "") + (job.atk_s ? `, 공격력 +${short(job.atk_s)}% (HP 연동)` : "");
  $("cls-extra").hidden = !CLASS_NOTES[cls]; $("cls-extra").textContent = CLASS_NOTES[cls] || "";

  // 버프 세팅이 실제로 어떤 수치로 들어갔는지
  const { town, pants, shoes, yellow, enc } = buffs;
  const townParts = [["크리", town.crit], ["극대", town.maxi], ["적응력", town.adapt], ["보뎀", town.boss], ["최종뎀", town.final]].filter(t => t[1]).map(t => `${t[0]} +${trimPct(t[1])}`);
  $("setup-info").textContent = `적용 값 · 마을 버프 ${townParts.join(" ") || "없음"} · 하의 크확 ×${trimPct(pants)} · 신발 극대 ×${trimPct(shoes)}` + (yellow ? " · 황색 크극 ×8%" : "") +
    ` · 격려 가동률 ${(enc.uptime * 100).toFixed(1)}% (쿨 ${Math.round(enc.cool)}초, 지속 ${Math.round(enc.dur)}초)`;

  // 실전 수치. 상한을 넘은 스탯은 넘은 만큼을 빨간 글씨로 붙이고, 아래에 작은 글씨로 어디서 온 값인지 적는다
  // 타일: [이름, 값, 빨간 글씨 등 한 줄, 추가 class, 툴팁, 출처 목록]
  const over = capOver(win, setup, job, resist);
  const tiles = [];
  if (hasCrit(base)) {
    const crOver = [over.crit && overText(over.crit, "crit"), over.crit_sat && overText(over.crit_sat, "crit_sat", "점감 ")].filter(Boolean).join(" · ");
    tiles.push(["평균 크리티컬 확률", fmt(critFinal(base), 1), crOver, "wide", "", chanceParts("crit", ctx)]);
    tiles.push(["크리티컬 데미지", fmt(base.crit_dmg, 1), "", "wide", "", critDmgParts(ctx)]);
  }
  if (hasMaxi(base)) {
    const mxOver = [over.maxi && overText(over.maxi, "maxi"), over.maxi_sat && overText(over.maxi_sat, "maxi_sat", "점감 ")].filter(Boolean).join(" · ");
    tiles.push(["최종 극대화", fmt(maxiFinal(base), 1), mxOver, "wide", "", chanceParts("maxi", ctx)]);
  }
  if (has(base, "boss")) {
    const p = CLASS[cls] || job;
    tiles.push(["보스 데미지", fmt(base.boss, 1), "", "wide", "", [
      ["스탯창", trimPct(win.boss)], setup.guild_boss ? ["길드", plus(setup.guild_boss)] : null, setup.town_boss ? ["마을", plus(setup.town_boss)] : null,
      p.boss ? ["패시브", plus(p.boss), (PASSIVE_SOURCES[cls] || {}).boss] : null]]);
  }
  if (has(win, "atk_pct")) {
    const hp = job.atk_s && has(base, "atk_pct");   // 메타모르피: HP 연동 공격력이 스탯형 공격력에 더해진다
    tiles.push(["공격력 % (스텟)", fmt(hp ? base.atk_pct : win.atk_pct, 2), win.atk_pct < 0 ? "값을 확인하세요" : "무기 공격력으로 역산", "", "",
      hp ? [["역산", trimPct(win.atk_pct)], ["패시브", plus(job.atk_s) + " (HP 연동)", (PASSIVE_SOURCES[cls] || {}).etc]] : null]);
  }
  // 적응력: 디버프를 얼마나 막았는지. 적응력이 상한이면 초적응력만 의미가 있다
  if (has(base, "adapt")) {
    const fin = adaptFinal(base), left = (base.debuff || 0) - fin, capped = base.adapt + (base.adapt_add || 0) >= ADAPT_CAP;
    tiles.push(["최종 적응력", fmt(fin, 1), (left > 0 ? `남은 디버프 ${trimPct(left)}` : "디버프 모두 막음") + (over.adapt ? ` · ${overText(over.adapt, "adapt", "적응력 ")}` : capped ? " · 적응력 상한" : ""), "",
      `마계 디버프 ${trimPct(base.debuff || 0)} 중 적응력으로 못 막은 만큼 데미지가 줄어요. 적응력은 60%까지, 초적응력은 그 위에 더해져요.`,
      [["스탯창", trimPct(win.adapt)], base.adapt_add ? ["마을", plus(base.adapt_add)] : null, base.super_adapt ? ["초적응력", plus(base.super_adapt)] : null]]);
  }
  // 양극화: 상한(60%)을 넘었을 때만 보여 준다
  if (over.polar) tiles.push(["양극화", fmt(POLAR_CAP, 1), `스탯창 ${fmt(win.polar, 1)} · ${overText(over.polar, "polar")}`, "", CAP_NOTES.polar]);
  // 초목: 크뎀 곱연산 30%를 얻고 보뎀 한 칸을 뺐을 때. "사냥석 뺀 기준/힘트마 뺀 기준"
  const chomok = chomokGain(win, job, resist, setup);
  if (chomok) tiles.push(["초목 효율", `${fmt(chomok.hunt)}/${fmt(chomok.atma)}`, "사냥석 -> 크리 +6% / 힘트마 -> 크리 +6%", "chomok",
    "크뎀 곱연산 30%를 얻고 보뎀 사냥석(2.5%) 또는 힘트마(3%) 한 칸을 뺐을 때의 DPS 상승률"]);
  $("tiles").innerHTML = tiles.length
    ? tiles.map(t => `<div class="tile${t[3] ? " " + t[3] : ""}"${t[4] ? ` title="${t[4]}"` : ""}><div class="k">${t[0]}</div><div class="v">${t[1]}</div>` +
        (t[2] ? `<div class="from">${t[2]}</div>` : "") + (t[5] ? partsHtml(t[5]) : "") + `</div>`).join("")
    : `<p class="hint">스탯창 값을 입력하면 버프와 패시브가 반영된 수치가 여기에 나와요.</p>`;
}
