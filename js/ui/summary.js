// 입력 옆의 안내 문구와 "실전 수치" 타일.

import { $, fmt, trimPct, esc } from "./dom.js";
import { CLASS, CLASS_NOTES, CLASS_SKILLS, PASSIVE_SOURCES } from "../data/classes.js";
import { has, hasCrit, hasMaxi, critFinal, maxiFinal, adaptFinal, POLAR_CAP } from "../calc/stats.js";
import { chomokGain } from "../calc/chomok.js";
import { capOver, CAP_NOTES } from "../calc/caps.js";
import { aspdCalc } from "../calc/aspd.js";
import { ASPD } from "../data/buffs.js";

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

// 크뎀·보뎀이 어디서 왔는지 작은 글씨로: "스탯창 199.4% · 패시브 +20% · 파티 버프 ×10% ..."
const PARTS_NOTE = "+는 합연산, ×는 곱연산(기본 크뎀 150%에만 곱해요)이에요. 밑줄 친 항목에 마우스를 올리면 어떤 패시브인지 나와요.";
const plus = x => "+" + trimPct(x), times = x => "×" + trimPct(x);
const ASPD_NOTE = "×는 곱연산(서로 곱해서 ×1.4까지), +는 점감 합연(스탯창과 같이 점감을 받고 30%까지), 무점감은 70% 천장 뒤에 그대로 더해져요.";
const ASPD_KIND = { mult: "곱연", dim: "점감 합연", flat: "무점감 합연" };
/** 전직 동속 패시브·버프 한 줄의 값 글자: ×10% / +10% / 무점감 +8% */
const aspdSkillValue = s => (s.kind === "mult" ? "×" : s.kind === "flat" ? "무점감 +" : "+") + trimPct(s.v);
/** 설명(툴팁). 사실상 상시인 것은 붙이지 않는다 */
const aspdSkillTip = s => s.always ? "" : [`${ASPD_KIND[s.kind]}${s.guess ? " (정확히 모름, 곱연으로 계산)" : ""}`, s.dur, s.note].filter(Boolean).join(" · ");
/** 스탯창 동속 (0.2143) -> 게임 스탯창처럼 100 기준 소수 둘째 자리 (121.43%). 필요한 값이라 올림한다 */
const aspdWinText = x => (Math.ceil((1 + x) * 10000 - 1e-6) / 100).toFixed(2) + "%";
/** 실전 동속이 최대(70%)가 되는 스탯창 값. need: 격려 중, needNormal: 평소 (못 닿으면 null) */
function aspdMaxText(need, needNormal) {
  if (need == null) return `스탯창 ${aspdWinText(ASPD.window_cap)}여도 최대(${trimPct(ASPD.final_cap)})에 못 닿아요`;
  if (needNormal != null && Math.abs(needNormal - need) < 5e-5) return `스탯창 ${aspdWinText(need)}면 최대`;
  return `스탯창 ${aspdWinText(need)}면 최대 (격려 중, 평소엔 ${needNormal == null ? `${aspdWinText(ASPD.window_cap)}여도 못 닿아요` : aspdWinText(needNormal)})`;
}
/** parts: [이름, 값 글자, 툴팁] 목록. 값이 0인 항목은 미리 빼고 넘긴다 */
function partsHtml(parts, note = PARTS_NOTE) {
  const items = parts.filter(Boolean).map(([label, value, tip]) => `<span${tip ? ` class="src" title="${esc(tip)}"` : ""}>${label} ${value}</span>`);
  return items.length ? `<div class="parts" title="${note}">${items.join(" · ")}</div>` : "";
}
/** 고른 선택 스킬: { name: "크리티컬 소드(일반)", o: 그 선택지의 효과(단위 %) } 또는 null */
function chosenSkill(cls, job) {
  const info = CLASS_SKILLS[cls];
  return info && job.skillChoice ? { name: `${info.skill}(${job.skillChoice})`, o: info.options[job.skillChoice] || {} } : null;
}
function critDmgParts({ cls, job, win, setup }) {
  const p = CLASS[cls] || job, tip = (PASSIVE_SOURCES[cls] || {}).crit_dmg, sk = chosenSkill(cls, job);
  return [
    ["스탯창", trimPct(win.crit_dmg)],
    p.cd_s ? ["패시브", plus(p.cd_s), tip] : null,
    ...(setup.cd_base_mults || []).filter(x => x).map((x, i) => [i === 0 ? "파티 버프" : "곱연", times(x)]),
    ...(setup.item_cd || []).filter(x => x.v).map(x => [x.name, times(x.v)]),
    p.cd_base ? ["패시브", times(p.cd_base), tip] : null,
    sk && sk.o.cd_base ? [sk.name, times(sk.o.cd_base / 100)] : null,
    p.cd_final ? ["패시브 크리 시", times(p.cd_final), tip] : null,
    p.hp_crit_over || p.hp_crit_under ? ["갈증 크리 시", `×${trimPct(p.hp_crit_over)}/${trimPct(p.hp_crit_under)} (HP 50% 초과/이하, 위 값엔 미포함)`, tip] : null,
  ];
}

let lastTilesHtml = null;

export function renderSummary(ctx) {
  const { cls, job, resist, win, base, setup, buffs } = ctx;
  // 전직·던전 안내
  $("field-info").textContent = `· 크리저항 ${Math.round(resist * 100)}% · 마계 디버프 ${Math.round((setup.debuff || 0) * 100)}%`;
  $("cls-info").textContent = `${job.type} · 공격력 ${job.tier}티어 · 패시브: 크확 ${passiveText(job.crit_s, job.crit_m, job.crit_a)}, 극대 ${passiveText(job.maxi_s, job.maxi_m, job.maxi_a)}, 크뎀 ${critDmgText(job)}` +
    (job.boss ? `, 보뎀 +${short(job.boss)}%` : "") + (job.atk_s ? `, 공격력 +${short(job.atk_s)}% (HP 연동)` : "");
  $("cls-extra").hidden = !CLASS_NOTES[cls]; $("cls-extra").textContent = CLASS_NOTES[cls] || "";

  // 버프 세팅이 실제로 어떤 수치로 들어갔는지
  const { town, pants, shoes, yellow, enc, items } = buffs;
  const townParts = [["크리", town.crit], ["극대", town.maxi], ["적응력", town.adapt], ["보뎀", town.boss], ["최종뎀", town.final]].filter(t => t[1]).map(t => `${t[0]} +${trimPct(t[1])}`);
  $("setup-info").textContent = `적용 값 · 마을 버프 ${townParts.join(" ") || "없음"} · 하의 크확 ×${trimPct(pants)} · 신발 극대 ×${trimPct(shoes)}` + (yellow ? " · 황색 크극 ×8%" : "") +
    ` · 격려 가동률 ${(enc.uptime * 100).toFixed(1)}% (쿨 ${Math.round(enc.cool)}초, 지속 ${Math.round(enc.dur)}초)` +
    (items || []).filter(x => x.v).map(x => ` · ${x.name} 크뎀 곱연 ×${trimPct(x.v)}`).join("") +   // 최종 데미지만 있는 아이템은 적지 않는다
    ` · 동작 속도 ${setup.aspd_party === false ? "솔로" : "파티"} 기준`;

  // 실전 수치. 상한을 넘은 스탯은 넘은 만큼을 빨간 글씨로 붙인다. 크뎀·보뎀은 아래에 작은 글씨로 어디서 온 값인지 적는다
  // 타일: [이름, 값, 빨간 글씨 등 한 줄, 추가 class, 툴팁, 출처 목록, 출처 설명, 이름 오른쪽에 붙일 것]
  const over = capOver(win, setup, job, resist);
  const tiles = [];
  // 순서: 공격력% / 크리 / 극대 / 크뎀 / 보뎀 / 적응력 (/ 양극화) / 동속 / 초목 효율
  if (has(win, "atk_pct")) {
    const hp = job.atk_s && has(base, "atk_pct");   // 메타모르피: HP 연동 공격력이 스탯형 공격력에 더해진다
    tiles.push(["공격력 % (스텟)", fmt(hp ? base.atk_pct : win.atk_pct, 2), win.atk_pct < 0 ? "값을 확인하세요" : ""]);
  }
  if (hasCrit(base)) {
    const crOver = [over.crit && overText(over.crit, "crit"), over.crit_sat && overText(over.crit_sat, "crit_sat", "점감 ")].filter(Boolean).join(" · ");
    tiles.push(["평균 크리티컬 확률", fmt(critFinal(base), 1), crOver]);
  }
  if (hasMaxi(base)) {
    const mxOver = [over.maxi && overText(over.maxi, "maxi"), over.maxi_sat && overText(over.maxi_sat, "maxi_sat", "점감 ")].filter(Boolean).join(" · ");
    tiles.push(["최종 극대화", fmt(maxiFinal(base), 1), mxOver]);
  }
  if (hasCrit(base)) tiles.push(["크리티컬 데미지", fmt(base.crit_dmg, 1), "", "wide", "", critDmgParts(ctx)]);
  if (has(base, "boss")) {
    const p = CLASS[cls] || job;
    tiles.push(["보스 데미지", fmt(base.boss, 1), "", "wide", "", [
      ["스탯창", trimPct(win.boss)], setup.guild_boss ? ["길드", plus(setup.guild_boss)] : null, setup.town_boss ? ["마을", plus(setup.town_boss)] : null,
      p.boss ? ["패시브", plus(p.boss), (PASSIVE_SOURCES[cls] || {}).boss] : null]]);
  }
  // 적응력: 적응력 + 마을 버프(상한 60%) + 초적응력
  if (has(base, "adapt")) {
    tiles.push(["최종 적응력", fmt(adaptFinal(base), 1), over.adapt ? overText(over.adapt, "adapt", "적응력 ") : "", "",
      `마계 디버프 ${trimPct(base.debuff || 0)} 중 적응력으로 못 막은 만큼 데미지가 줄어요. 적응력은 60%까지, 초적응력은 그 위에 더해져요.`]);
  }
  // 양극화: 상한(60%)을 넘었을 때만 보여 준다
  if (over.polar) tiles.push(["양극화", fmt(POLAR_CAP, 1), overText(over.polar, "polar"), "", CAP_NOTES.polar]);
  // 동작 속도: DPS에는 안 넣는다. 평소/격려 중 실전 값, 최대(70%)가 되는 스탯창 값
  // 파티 동작 속도 칸은 타일 밖(바로 아래)에 둔다: 타일은 입력할 때마다 다시 그려져서 안에 두면 입력 중에 칸이 바뀐다
  $("aspd_party_row").hidden = !has(win, "aspd");
  if (has(win, "aspd")) {
    const skills = setup.aspd_class || [], on = k => skills.filter(s => s.on && s.kind === k);
    const mults = (setup.aspd_mults || []).concat(on("mult")), party = setup.aspd_party !== false;
    const a = aspdCalc(win.aspd, mults.map(x => x.v), ASPD.encourage, on("dim").map(s => s.v), on("flat").map(s => s.v));
    const seg = `<span class="seg" role="group" aria-label="동작 속도 기준">` +
      [["1", "파티", "녹힐 버프와 파티 동작 속도 포함"], ["0", "솔로", "녹힐 버프·파티 동작 속도 없이"]].map(([v, label, tip]) =>
        `<button type="button" data-aspd-party="${v}" aria-pressed="${(v === "1") === party}" title="${tip}">${label}</button>`).join("") + `</span>`;
    // 값 아래 줄: 넘은 만큼(빨간 글씨) 옆에 최대가 되는 스탯창 값 (게임 스탯창처럼 121.43%)
    const max = aspdMaxText(a.need, a.needNormal);
    const line = a.over > 5e-5 ? `${overText(a.over, "aspd", "스탯창 ")} · ${max}` : max;
    // 켜고 끌 수 있는 전직 패시브·버프 (표의 "선택사항")
    const opts = skills.filter(s => s.toggle);
    const toggles = opts.length ? `<div class="aspd-skills" role="group" aria-label="켜고 끌 수 있는 동속 패시브·버프">` + opts.map(s =>
      `<button type="button" data-aspd-skill="${esc(s.key)}" aria-pressed="${s.on}" title="${esc(aspdSkillTip(s))}">${esc(s.name)} ${aspdSkillValue(s)}</button>`).join("") + `</div>` : "";
    // 합연 패시브(점감·무점감)는 따로 적지 않고 스탯창 값에 마우스를 올리면 보이게 한다. 곱연은 뒤에 따로 적는다
    const dims = on("dim"), statText = dims.length ? `${trimPct(Math.min(win.aspd, ASPD.window_cap))} → ${trimPct(a.stat)}` : trimPct(Math.min(win.aspd, ASPD.window_cap));
    const statTip = [...on("dim"), ...on("flat")].map(s => `${s.name} ${ASPD_KIND[s.kind]} +${trimPct(s.v)}`).join("\n");
    tiles.push(["동작 속도 (평소/격려 중)", `${fmt(a.normal, 1)}/${fmt(a.enc, 1)}`, line, "wide",
      "DPS에는 넣지 않아요. 전직 패시브·버프는 정리해 둔 표 기준이고, 아래 버튼은 켜고 끌 수 있는 것이에요.",
      [["스탯창", statText, statTip],
        ...(setup.aspd_mults || []).map(x => [x.name, times(x.v)]),
        ...on("mult").map(s => [s.name, times(s.v)]),   // 전직 곱연 패시브는 설명(밑줄) 없이 적는다. 켜고 끄는 것은 아래 버튼에 설명이 있다
        ["격려", times(ASPD.encourage) + " (격려 중)"]], ASPD_NOTE, seg, toggles]);
  }
  // 초목: 크뎀 곱연산 30%를 얻고 보뎀 한 칸을 뺐을 때. "사냥석 뺀 기준/힘트마 뺀 기준"
  const chomok = (setup.item_cd || []).some(x => x.slot === "atma" && x.name === "초목의 아트마") ? null : chomokGain(win, job, resist, setup);   // 이미 초목이면 안 보여 준다
  if (chomok) tiles.push(["초목 효율", `${fmt(chomok.hunt)}/${fmt(chomok.atma)}`, "사냥석 -> 크리 / 힘트마 -> 크리", "chomok",
    "크뎀 곱연산 30%를 얻고 보뎀 사냥석(2.5%) 또는 힘트마(3%) 한 칸을 뺐을 때의 DPS 상승률"]);
  const html = tiles.length
    ? tiles.map(t => `<div class="tile${t[3] ? " " + t[3] : ""}"${t[4] ? ` title="${t[4]}"` : ""}>` +
        (t[7] ? `<div class="k with-seg"><span>${t[0]}</span>${t[7]}</div>` : `<div class="k">${t[0]}</div>`) + `<div class="v">${t[1]}</div>` +
        (t[2] ? `<div class="from">${t[2]}</div>` : "") + (t[5] ? partsHtml(t[5], t[6]) : "") + (t[8] || "") + `</div>`).join("")
    : `<p class="hint">스탯창 값을 입력하면 버프와 패시브가 반영된 수치가 여기에 나와요.</p>`;
  // 바뀐 게 없으면 다시 그리지 않는다: 입력칸에서 빠져나올 때(change) 다시 그리면 그 사이에 누른 타일 안 버튼(파티/솔로)의 클릭이 사라진다
  if (html !== lastTilesHtml) { $("tiles").innerHTML = html; lastTilesHtml = html; }
}
