// "악세 세팅" 화면: 지금 낀 장비와 바꿔 볼 장비를 고르면 세트 효과까지 합친 DPS 변화를 보여 준다.
// 캐릭터 창 스크린샷을 올리면 아이콘을 알아봐서 "지금" 칸을 채운다.

import { $, esc, signed, trimPct } from "./dom.js";
import { ACC_SLOTS, ACCESSORIES, NEW_ACCESSORIES, ARMOR_AVATARS, WEAPON_AVATARS, OUTFITS, WEAPONS, ATMA, AVATAR_SET_LIMIT } from "../data/accessories.js";
import { ICONS } from "../data/icons.js";
import { compareGear, emptyGear, STAT_NAMES, IGNORED } from "../calc/gear.js";
import { optimizeGear } from "../calc/gear-optimize.js";
import { capOver, CAP_NOTES } from "../calc/caps.js";
import { findCharWindow, equipCells } from "../ocr/equip-window.js";
import { matchCell, isEmptySlot, decodeFeature, encodeFeature, featureDistance, KEEP_BACKGROUND, MAX_DISTANCE } from "../ocr/icons.js";

const KEY = "elsword-gear-v1", ICON_KEY = "elsword-gear-icons-v1";
const ALL_ACC = [...ACCESSORIES, ...NEW_ACCESSORIES];
const SAME = "=";   // "바꿔 보기"에서 그대로

// ----- 화면에 그릴 줄 -----
const slotName = s => (s.key === "weapon" ? "무기 악세" : s.name);   // 무기 아바타·무기 종류와 헷갈리지 않게
// 줄 하나: [묶음, 부위, 이름]. 묶음 wear 는 한 벌·5셋(레어 아바타 다섯 부위)·무기 아바타
const TABLES = [
  { title: "무기", rows: [["weapon", "weapon", "무기 종류"]] },
  { title: "아바타 악세", rows: [["wear", "outfit", "한 벌"], ["wear", "set5", "5셋"], ["wear", "wavatar", "무기 아바타"], ...ACC_SLOTS.map(s => ["avatar", s.key, slotName(s)])] },
  { title: "일반 악세", atma: true, rows: ACC_SLOTS.filter(s => s.key !== "ring").map(s => ["normal", s.key, slotName(s)]).concat([["normal", "ring", "반지 1"], ["normal", "ring2", "반지 2"]]) },
];
const ROWS = TABLES.flatMap(t => t.rows);
/** 줄의 "고정" 이름 (자동 찾기의 LOCKABLE 과 같은 이름). 무기 종류는 늘 그대로라 없다 */
const lockKey = (group, slot) => group === "weapon" ? null : group === "wear" ? (slot === "set5" ? "armor" : slot) : `${group}.${slot}`;
const LOCK_TITLE = "자동 찾기에서 지금 것을 그대로 둬요";
const lockCell = (key, name) => `<td class="lock">${key ? `<input type="checkbox" id="gear-lock-${key}" data-lock="${key}" aria-label="${esc(name)} 고정" title="${LOCK_TITLE}">` : ""}</td>`;
const ARMOR_PIECES = ["hair", "top", "bottom", "gloves", "shoes"];
const ATMA_GRADED = ATMA.pieces.filter(s => s !== "top");   // 만다라는 등급이 이름에 들어 있다
const SET_GRADES = ATMA.grades.slice(ATMA.grades.indexOf(ATMA.maxGrade));

/** 화면 표시용 짧은 이름 */
function shortName(name) {
  const m = name.match(/연화세계 정령왕의 (.+?) - OO의 (아트마|니르바나)(?:\((\S+), )?/);
  if (m) return m[1] === "만다라" ? `아트마 만다라 · ${m[2]} (${m[3]})` : `아트마 ${m[1]}`;
  return name;
}

/**
 * (묶음, 부위)에 고를 수 있는 것: [[값, 표시 이름]].
 * 데이터는 시트 순서(오래된 것부터)라, 최근에 나온 것이 위에 오도록 뒤집는다
 */
function choices(group, slot) {
  if (group === "weapon") return WEAPONS.map(w => [w.name, w.set ? `${w.name} (${w.set})` : w.name]);
  let list;
  if (group === "avatar" || group === "normal") {
    const s = slot === "ring2" ? "ring" : slot, items = ALL_ACC.filter(a => a.layer === group && a.slot === s);
    const opt = a => [a.name, shortName(a.name) + (a.unknown ? " (수치 모름)" : "")];
    // 아트마 악세는 등급 순서(레전드리부터 아래로) 그대로 맨 위에 둔다
    return items.filter(a => a.atma).map(opt).concat(items.filter(a => !a.atma).reverse().map(opt));
  }
  else if (slot === "outfit") list = OUTFITS.map(o => [o.name, o.name]);
  else if (slot === "wavatar") list = WEAPON_AVATARS.map(w => [w.name, w.name]);
  else list = Object.keys(ARMOR_AVATARS).map(n => [n, n]);
  return list.reverse();
}

const sel = (side, group, slot) => $(`gear-${side}-${group}-${slot}`);
const options = (list, first) => first.concat(list).map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");

function buildTables() {
  let html = "";
  for (const table of TABLES) {
    html += `<div class="sub">${table.title}</div><div class="tbl-wrap"><table class="gear"><thead><tr><th>부위</th><th>지금</th><th>바꿔 보기</th><th class="lock" title="${LOCK_TITLE}">고정</th></tr></thead><tbody>`;
    if (table.atma) {
      const els = ATMA.elements.map(e => [e, e]);
      html += `<tr class="atma"><td class="lbl">아트마 속성</td>` +
        `<td><div class="pick"><select id="gear-now-element" aria-label="지금 아트마 속성">${options(els, [])}</select></div></td>` +
        `<td class="next"><div class="pick"><select id="gear-next-element" aria-label="바꿔 볼 아트마 속성">${options(els, [[SAME, "그대로"]])}</select></div></td>${lockCell("element", "아트마 속성")}</tr>`;
    }
    for (const [group, slot, name] of table.rows) {
      const list = choices(group, slot), grade = group === "normal" && ATMA_GRADED.includes(slot);
      const gradeSel = side => grade ? `<select class="grade" id="gear-${side}-grade-${slot}" aria-label="${name} 아트마 등급" hidden>${options(SET_GRADES.map(g => [g, g]), side === "next" ? [[SAME, "그대로"]] : [])}</select>` : "";
      const none = group === "weapon" ? "그 밖의 무기" : "미착용";
      html += `<tr><td class="lbl">${name}</td>` +
        `<td><div class="pick"><select id="gear-now-${group}-${slot}" aria-label="지금 ${table.title} ${name}">${options(list, [["", none]])}</select>${gradeSel("now")}</div></td>` +
        `<td class="next"><div class="pick"><select id="gear-next-${group}-${slot}" aria-label="바꿔 볼 ${table.title} ${name}">${options(list, [[SAME, "그대로"], ["", none]])}</select>${gradeSel("next")}</div></td>${lockCell(lockKey(group, slot), `${table.title} ${name}`)}</tr>`;
    }
    html += `</tbody></table></div>`;
    if (table.title === "무기") html += `<p class="hint">레이드 무기는 같은 레이드 악세 세트 개수에 들어가요 (사룡무 → 공중요새의 유산, 암귀무 → 심연 레이드 세트). 스크린샷으로는 채우지 않으니 직접 골라 주세요. 자동 찾기에서도 무기 종류는 그대로 둬요.</p>`;
    if (table.title === "아바타 악세") html += `<p class="hint">5셋은 레어 아바타 헤어·상의·하의·장갑·신발을 한 세트로 맞춰 입은 것이에요.</p>`;
  }
  $("gear-tables").innerHTML = html;
}

// ----- 화면 -> 장착 상태 -----
const isAtmaItem = name => { const a = ALL_ACC.find(x => x.name === name); return !!(a && a.atma); };

function readGear(side) {
  const g = emptyGear();
  const val = (group, slot) => {
    const v = sel(side, group, slot).value;
    return side === "next" && v === SAME ? sel("now", group, slot).value : v;
  };
  for (const [group, slot] of ROWS) {
    const v = val(group, slot) || null;
    if (group === "weapon") g.weapon = v;
    else if (group === "wear") {
      if (slot === "outfit") g.outfit = v;
      else if (slot === "wavatar") g.wavatar = v;
      else for (const piece of ARMOR_PIECES) g.armor[piece] = v;   // 5셋: 다섯 부위가 같은 세트
    }
    else g[group][slot] = v;
  }
  const el = $(`gear-${side}-element`).value;
  g.atma.element = side === "next" && el === SAME ? $("gear-now-element").value : el;
  for (const slot of ATMA_GRADED) {
    const v = $(`gear-${side}-grade-${slot}`).value;
    g.atma.grades[slot] = side === "next" && v === SAME ? $(`gear-now-grade-${slot}`).value : v;
  }
  if (side === "now") g.avatarSets = nowAvatarSets;
  return g;
}

/** 아트마 악세를 고른 칸에만 등급 칸을 보인다 */
function syncGrades() {
  for (const side of ["now", "next"]) for (const slot of ATMA_GRADED) {
    let v = sel(side, "normal", slot).value;
    if (side === "next" && v === SAME) v = sel("now", "normal", slot).value;
    $(`gear-${side}-grade-${slot}`).hidden = !isAtmaItem(v);
  }
}

/** "고정"에 체크한 칸 이름들 */
const readLocks = () => [...document.querySelectorAll("#gear-tables input[data-lock]")].filter(e => e.checked).map(e => e.dataset.lock);

/** 자동 찾기 결과를 "바꿔 보기" 칸에 채운다. 지금과 같은 칸은 "그대로" */
function fillNext(g) {
  const now = readGear("now");
  const wear = (x, slot) => slot === "outfit" ? x.outfit : slot === "wavatar" ? x.wavatar : x.armor.hair;
  for (const [group, slot] of ROWS) {
    if (group === "weapon") continue;
    const want = (group === "wear" ? wear(g, slot) : g[group][slot]) || null;
    const cur = (group === "wear" ? wear(now, slot) : now[group][slot]) || null;
    const e = sel("next", group, slot);
    e.value = want === cur ? SAME : (want || "");
    e.classList.remove("filled", "check");
  }
  $("gear-next-element").value = g.atma.element === now.atma.element ? SAME : g.atma.element;
  for (const slot of ATMA_GRADED) {
    const same = g.normal[slot] === now.normal[slot] && g.atma.grades[slot] === now.atma.grades[slot];
    $(`gear-next-grade-${slot}`).value = same || !isAtmaItem(g.normal[slot]) ? SAME : g.atma.grades[slot];
  }
}

/** 결과에 보여 줄 스탯창 칸 (스펙 계산의 입력칸 순서) */
const WINDOW_STATS = [
  ["crit", "크리티컬"], ["crit_dmg", "크리티컬 데미지"], ["maxi", "극대화"], ["atk_pct", "공격력 % (스텟)"], ["boss", "보스 데미지"],
  ["all_skill", "모든 스킬 데미지"], ["cho", "초월한 스킬 데미지"], ["gang", "강렬한 스킬 데미지"], ["polar", "양극화"], ["add", "추가 지속 피해"],
  ["hp_over", "HP 50% 초과 적 데미지"], ["hp_under", "HP 50% 이하 적 데미지"], ["hp100", "HP 100% 이하 적 데미지"],
  ["adapt", "적응력"], ["super_adapt", "초적응력"], ["cdr_gang", "강렬한 스킬 재사용 시간 감소"], ["cdr_cho", "초월한 스킬 재사용 시간 감소"],
];

// ----- 무악 세트를 4개 이상 맞췄을 때 "지금" 켜 둔 세트 -----
let nowAvatarSets = null;

// ----- 결과 -----
/** 0.025 -> "+2.5%", -0.1 -> "−10%" (소수 둘째 자리까지, 뒤의 0은 뗀다) */
const pctText = v => signed(v, 2).replace(/(\.\d*?)0+%$/, "$1%").replace(/\.%$/, "%");
const stagesText = s => `${s.count}개 (${s.stages.join("·")}세트)`;

let lastCtx = null;   // 자동 찾기가 쓰는 마지막 스탯창·버프 값
const hasWindow = win => Object.keys(win).some(k => k !== "share_cho" && k !== "share_gang");

/** 상한을 넘은 양: 빨간 글씨 "1% 초과" (크리·극대화는 실전 값 기준) */
const overSpan = (over, k) => over[k] ? `<span class="over" title="${esc(CAP_NOTES[k])}">${k === "crit" || k === "maxi" ? "실전 " : ""}${trimPct(over[k])} 초과</span>` : "";

export function renderGear({ win, job, resist, setup }) {
  lastCtx = { win, job, resist, setup };
  syncGrades();
  const out = $("gear-out");
  if (!hasWindow(win)) {
    out.innerHTML = `<p class="hint">먼저 <a href="#spec">스펙 계산</a>에 스탯창 값을 넣어 주세요. 그 값을 기준으로 바꿨을 때의 차이를 계산해요.</p>`;
    $("gear-float").hidden = true;
    return;
  }
  const r = compareGear({ win, job, resist, setup }, readGear("now"), readGear("next"));
  const changed = JSON.stringify(readGear("now")) !== JSON.stringify(Object.assign(readGear("next"), { avatarSets: nowAvatarSets }));
  const float = $("gear-float");
  float.hidden = !changed;
  float.innerHTML = `<span>DPS 변화</span><b class="${r.gain > 1e-9 ? "up" : r.gain < -1e-9 ? "down" : ""}">${signed(r.gain)}</b><a href="#gear-results">자세히</a>`;
  let html = `<div class="gear-gain ${r.gain > 1e-9 ? "up" : r.gain < -1e-9 ? "down" : ""}"><span class="v">${changed ? signed(r.gain) : "±0%"}</span><span class="k">DPS 변화 (지금 세팅 대비)</span></div>`;
  if (!changed) html += `<p class="hint">"바꿔 보기"에서 부위를 골라 보세요. 세트 효과가 켜지고 꺼지는 것까지 함께 계산해요.</p>`;

  // 세트 효과
  const names = [...new Set([...r.before.sets, ...r.after.sets].map(s => s.name))];
  const cell = s => !s ? `<span class="muted">-</span>` : s.active ? stagesText(s) : `<span class="muted">${stagesText(s)} · 꺼짐</span>`;
  const atmaCell = a => a.grade ? (a.active ? `${a.element} · ${a.grade} (${a.count}개)` : `<span class="muted">${a.element} · 효과 없음</span>`) : `<span class="muted">${a.count}개 (4개부터)</span>`;
  if (names.length || r.before.atma.count || r.after.atma.count) {
    html += `<div class="sub">세트 효과</div><div class="tbl-wrap"><table class="gear-out"><thead><tr><th>세트</th><th>지금</th><th>바꾼 뒤</th></tr></thead><tbody>`;
    for (const n of names) {
      const b = r.before.sets.find(s => s.name === n), a = r.after.sets.find(s => s.name === n);
      const diff = JSON.stringify(b && b.active && b.stages) !== JSON.stringify(a && a.active && a.stages);
      html += `<tr class="${diff ? "diff" : ""}"><td>${esc(n)}</td><td>${cell(b)}</td><td>${cell(a)}</td></tr>`;
    }
    if (r.before.atma.count || r.after.atma.count) {
      const diff = JSON.stringify([r.before.atma.grade, r.before.atma.element, r.before.atma.active]) !== JSON.stringify([r.after.atma.grade, r.after.atma.element, r.after.atma.active]);
      html += `<tr class="${diff ? "diff" : ""}"><td>연화세계 정령왕 (아트마)</td><td>${atmaCell(r.before.atma)}</td><td>${atmaCell(r.after.atma)}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }

  // 무악 세트 고르기 (지금 세팅이 4개 이상일 때)
  if (r.before.avatarSetCount > AVATAR_SET_LIMIT) {
    const list = r.before.sets.filter(s => s.kind === "avatar");
    html += `<div class="sub">지금 켜 둔 무악 세트 (${AVATAR_SET_LIMIT}개)</div><div class="checks" id="gear-avatar-sets">` +
      list.map(s => `<label><input type="checkbox" value="${esc(s.name)}"${s.active ? " checked" : ""}> ${esc(s.name)}</label>`).join("") + `</div>` +
      `<p class="hint">무악 세트 효과는 ${AVATAR_SET_LIMIT}개까지만 켜져요. 게임에서 켜 둔 세트를 골라 주세요. 바꾼 뒤는 가장 좋은 조합으로 계산해요.</p>`;
  }

  // 스탯창 전체: 지금 -> 바꾼 뒤 (바뀐 줄은 굵게)
  const after = r.win, stat = x => (x * 100).toFixed(2) + "%";
  const overNow = capOver(win, setup, job, resist), overAfter = capOver(after, setup, job, resist);
  const lines = WINDOW_STATS.filter(([k]) => typeof win[k] === "number").map(([k, name]) => {
    const d = after[k] - win[k], diff = Math.abs(d) > 5e-5;
    return `<tr class="${diff ? "diff" : ""}"><td>${name}</td><td class="num">${stat(win[k])}${overSpan(overNow, k)}</td><td class="num">${stat(after[k])}${overSpan(overAfter, k)}</td><td class="num">${diff ? pctText(d).replace("%", "%p") : ""}</td></tr>`;
  });
  const prod = xs => xs.reduce((a, x) => a * (1 + x), 1), mult = x => "x" + x.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  const hidden = [["크뎀 곱연산", prod(r.hidden.cd[0]), prod(r.hidden.cd[1])], ["최종 데미지", prod(r.hidden.final[0]), prod(r.hidden.final[1])]];
  for (const [name, b, a] of hidden) {
    const diff = Math.abs(a / b - 1) > 1e-9;
    lines.push(`<tr class="hidden-stat ${diff ? "diff" : ""}"><td>${name} <span class="muted">(스탯창에 안 보임)</span></td><td class="num">${mult(b)}</td><td class="num">${mult(a)}</td><td class="num">${diff ? pctText(a / b - 1) : ""}</td></tr>`);
  }
  html += `<div class="sub">스탯창 (지금 → 바꾼 뒤)</div><div class="tbl-wrap"><table class="gear-out stats"><thead><tr><th>스탯</th><th class="num">지금</th><th class="num">바꾼 뒤</th><th class="num">변화</th></tr></thead><tbody>${lines.join("")}</tbody></table></div>` +
    `<p class="hint">크리티컬·극대화는 점감이 다시 걸린 값이에요. 곱연 크뎀과 최종 데미지는 장비에서 나오는 배율만 따로 보여 줘요.` +
    (Object.keys(overNow).length || Object.keys(overAfter).length ? ` <span class="over">빨간 글씨</span>는 상한을 넘어서 DPS에 도움이 안 되는 만큼이에요 (적응력은 마을 버프 포함).` : "") + `</p>`;

  // 알림
  const notes = [];
  if (r.blank.length) notes.push(`스펙 계산의 ${r.blank.map(k => `"${STAT_NAMES[k] || k}"`).join(", ")} 칸이 비어 있어 이 변화는 계산에서 빠졌어요.`);
  const ign = Object.entries(r.ignored).filter(([, v]) => Math.abs(v) > 1e-9);
  if (ign.length) notes.push(`계산에 넣지 않은 옵션: ${ign.map(([k, v]) => `${IGNORED[k]} ${pctText(v)}`).join(", ")}`);
  const unknown = [...new Set([...r.before.unknown, ...r.after.unknown])];
  if (unknown.length) notes.push(`수치를 모르는 아이템은 효과가 없는 것으로 계산했어요: ${unknown.join(", ")}`);
  if ([r.before.atma, r.after.atma].some(a => a.grade && !a.active)) notes.push("이 속성의 아트마 세트 효과는 데이터에 없어서 계산하지 않았어요.");
  if (notes.length) html += `<ul class="notes">${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
  out.innerHTML = html;
}

// ----- 저장 -----
function allSelects() { return [...document.querySelectorAll("#gear-tables select")]; }

const DEFAULT_WEAPON = "사룡무";

function saveGear() {
  const s = { v: 2, sel: Object.fromEntries(allSelects().map(e => [e.id, e.value])), avatarSets: nowAvatarSets, locks: readLocks() };
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장이 막힌 환경 */ }
}
function loadGear() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s) return;
    if (s.v === 1 && s.sel && s.sel["gear-now-weapon-weapon"] === "") delete s.sel["gear-now-weapon-weapon"];   // 무기 기본값(사룡무)이 없던 때
    for (const e of allSelects()) if (s.sel && e.id in s.sel && [...e.options].some(o => o.value === s.sel[e.id])) e.value = s.sel[e.id];
    nowAvatarSets = Array.isArray(s.avatarSets) ? s.avatarSets : null;
    if (Array.isArray(s.locks)) for (const e of document.querySelectorAll("#gear-tables input[data-lock]")) e.checked = s.locks.includes(e.dataset.lock);
  } catch (e) { /* 못 읽으면 처음 상태로 */ }
}

// ----- 아이콘 기준표 (기본 + 이 브라우저가 배운 것) -----
const BASE_REFS = ICONS.map(([g, s, id, f, el]) => ({ g, s, id, f: decodeFeature(f), el }));
function learnedRefs() {
  try { return (JSON.parse(localStorage.getItem(ICON_KEY) || "[]")).map(([g, s, id, f]) => ({ g, s, id, f: decodeFeature(f) })); } catch (e) { return []; }
}
function learn(g, s, id, f) {
  try {
    const list = JSON.parse(localStorage.getItem(ICON_KEY) || "[]").filter(([g2, s2, , f2]) => !(g2 === g && s2 === s && featureDistance(decodeFeature(f2), f) < 0.3));
    if (id) list.push([g, s, id, encodeFeature(f)]);
    localStorage.setItem(ICON_KEY, JSON.stringify(list.slice(-300)));
  } catch (e) { /* 저장이 막힌 환경 */ }
}

// 스크린샷 칸 -> 화면의 줄, 기준표의 부위 (레어 아바타 다섯 칸은 모두 5셋 한 줄)
const rowOf = c => c.group === "avatar" || c.group === "normal" ? [c.group, c.slot] : c.group === "outfit" ? ["wear", "outfit"] : c.group === "wavatar" ? ["wear", "wavatar"] : ["wear", "set5"];
const refSlot = c => (c.slot === "ring2" ? "ring" : c.slot);

let lastShot = {};   // 마지막 스크린샷에서 읽은 칸별 특징값 (사용자가 고치면 기억하려고)

function status(lines, warn) {
  const el = $("gear-shot-status");
  lines = [].concat(lines || []).filter(Boolean);
  el.hidden = !lines.length; el.className = warn ? "warn" : ""; el.textContent = "";
  for (const t of lines) { const li = document.createElement("li"); li.textContent = t; el.appendChild(li); }
}

function fileToPixels(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
      resolve(g.getImageData(0, 0, c.width, c.height));
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    im.src = url;
  });
}

let busy = false;
async function fillFromShot(file, onChange) {
  if (busy || !file) return;
  busy = true; status("이미지를 여는 중…");
  try {
    const px = await fileToPixels(file), { data, width, height } = px;
    const win = findCharWindow(data, width, height);
    if (!win) { status("캐릭터 창을 찾지 못했어요. 캐릭터 창 전체(오른쪽 아래 '모험가 장비 리포트' 버튼까지)가 보이게 찍어 주세요.", true); return; }
    const refs = BASE_REFS.concat(learnedRefs());
    document.querySelectorAll("#gear-tables select.filled, #gear-tables select.check").forEach(e => e.classList.remove("filled", "check"));
    lastShot = {};
    let sure = 0, unsure = 0, empty = 0, element = null;
    const armor = [];   // 레어 아바타 다섯 칸의 결과
    for (const c of equipCells(win)) {
      const [group, slot] = rowOf(c), el = sel("now", group, slot);
      const isArmor = c.group === "armor";
      if (isEmptySlot(data, width, c.box)) {
        if (isArmor) { armor.push(null); continue; }
        el.value = ""; el.classList.add("filled"); empty++; continue;
      }
      const cand = refs.filter(r => r.g === c.group && r.s === refSlot(c));
      const m = matchCell(data, width, c.box, cand, { keepBackground: KEEP_BACKGROUND.has(c.group) });
      const shot = { g: c.group, s: refSlot(c), f: m ? m.feature : null };
      if (isArmor) { (lastShot[el.id] = lastShot[el.id] || []).push(shot); armor.push(m && m.distance <= MAX_DISTANCE * 1.6 ? m : null); continue; }
      lastShot[el.id] = [shot];
      if (!m || m.distance > MAX_DISTANCE * 1.6) { el.classList.add("check"); unsure++; continue; }   // 기준표에 없는 아이템
      el.value = m.id;
      el.classList.add(m.sure ? "filled" : "check");
      if (m.sure) sure++; else unsure++;
      // 아트마 악세면 가장 닮은 기준 아이콘의 속성을 쓴다
      if (isAtmaItem(m.id)) {
        const near = cand.filter(r => r.id === m.id && r.el).sort((a, b) => featureDistance(m.feature, a.f) - featureDistance(m.feature, b.f))[0];
        if (near && !element) element = near.el;
      }
    }
    if (element) { $("gear-now-element").value = element; $("gear-now-element").classList.add("check"); }
    // 5셋: 다섯 칸 중 가장 많이 나온 세트. 모두 같고 확신이 있을 때만 확신으로 본다
    if (armor.length) {
      const el = sel("now", "wear", "set5"), counts = new Map();
      for (const m of armor) if (m) counts.set(m.id, (counts.get(m.id) || 0) + 1);
      const top = [...counts].sort((a, b) => b[1] - a[1])[0];
      el.value = top ? top[0] : "";
      const allSame = top && top[1] === armor.length && armor.every(m => m && m.sure);
      el.classList.add(allSame || !armor.some(Boolean) ? "filled" : "check");
      if (allSame || !armor.some(Boolean)) sure++; else unsure++;
    }
    status([
      `${sure + unsure + empty}칸을 읽었어요. 확신 ${sure}칸, 빈 칸 ${empty}칸${unsure ? `, 확인이 필요한 칸 ${unsure}칸(노란 테두리)` : ""}.`,
      element ? "아트마 악세는 아이콘으로 등급·속성이 구분되지 않아요. 아트마 속성과 등급을 확인해 주세요." : "",
      unsure ? "노란 칸을 직접 고쳐 주면 그 아이콘을 기억해서 다음부터 맞춰요." : "",
    ]);
    onChange();
  } catch (e) {
    status("이미지를 열지 못했어요.", true);
  } finally {
    busy = false; $("gear-shot-file").value = "";
  }
}

// ----- 시작 -----
export function initGear(onChange) {
  buildTables();
  $("gear-now-weapon-weapon").value = DEFAULT_WEAPON;
  loadGear();
  const tables = $("gear-tables");
  tables.addEventListener("change", e => {
    const t = e.target;
    if (t.classList) t.classList.remove("filled", "check");
    if (t.id && t.id.startsWith("gear-now-") && lastShot[t.id]) {   // 사용자가 고친 칸의 아이콘을 기억 (5셋은 다섯 칸 모두)
      for (const { g, s, f } of lastShot[t.id]) if (f) learn(g, s, t.value, f);
    }
    saveGear();
  });
  $("gear-out").addEventListener("change", e => {
    if (!e.target.closest("#gear-avatar-sets")) return;
    const boxes = [...document.querySelectorAll("#gear-avatar-sets input")];
    let on = boxes.filter(b => b.checked).map(b => b.value);
    if (on.length > AVATAR_SET_LIMIT) { e.target.checked = false; on = on.filter(n => n !== e.target.value); }
    nowAvatarSets = on.length ? on : null;
    saveGear(); onChange();
  });
  $("gear-optimize").addEventListener("click", () => {
    const st = $("gear-opt-status"), btn = $("gear-optimize");
    st.hidden = false;
    if (!lastCtx || !hasWindow(lastCtx.win)) { st.textContent = "먼저 스펙 계산에 스탯창 값을 넣어 주세요. 그 값으로 DPS를 계산해서 찾아요."; return; }
    btn.disabled = true; st.textContent = "찾는 중이에요…";
    setTimeout(() => {   // "찾는 중" 글자가 먼저 그려지게
      try {
        const t = performance.now();
        const now = readGear("now");
        const r = optimizeGear(lastCtx, now, { locked: readLocks() });
        const sec = Math.max(0.1, (performance.now() - t) / 1000).toFixed(1);
        fillNext(r.gear);
        // 스탯창에는 지금 낀 장비 효과가 이미 들어 있어서, 지금 세팅이 비어 있으면 변화가 실제보다 크게 나온다
        const worn = Object.values(now.avatar).concat(Object.values(now.normal)).filter(Boolean).length;
        st.textContent = (r.gain > 1e-9
          ? `가장 좋은 조합을 "바꿔 보기"에 채웠어요. 지금보다 DPS ${signed(r.gain)} · 세트 조합 ${r.plans.toLocaleString("ko-KR")}가지를 따져 봤어요 (${sec}초).`
          : "지금 세팅이 이미 가장 좋아요.") +
          (worn < 12 ? " 지금 세팅 칸이 많이 비어 있어서 변화가 실제보다 크게 나올 수 있어요. 지금 낀 것을 먼저 채워 주세요." : "");
        saveGear(); onChange();
      } catch (e) {
        st.textContent = "찾다가 문제가 생겼어요. 새로고침한 뒤 다시 해 주세요.";
      } finally { btn.disabled = false; }
    }, 30);
  });
  $("gear-reset-next").addEventListener("click", () => {
    for (const e of allSelects()) if (e.id.startsWith("gear-next-")) e.value = SAME;
    saveGear(); onChange();
  });
  $("gear-clear").addEventListener("click", () => {
    for (const e of allSelects()) if (e.id.startsWith("gear-now-")) { e.value = e.id.includes("-grade-") ? "유니크" : e.id.endsWith("-element") ? "유수" : e.id.endsWith("-weapon") ? DEFAULT_WEAPON : ""; e.classList.remove("filled", "check"); }
    nowAvatarSets = null; lastShot = {};
    saveGear(); onChange();
  });

  // 스크린샷: 파일 고르기, 끌어다 놓기, 붙여넣기 (악세 세팅 화면에 있을 때만)
  const fill = file => fillFromShot(file, onChange);
  const firstImage = files => [...(files || [])].find(f => f.type.startsWith("image/"));
  $("gear-shot-file").addEventListener("change", e => fill(e.target.files[0]));
  document.addEventListener("paste", e => {
    if (document.body.dataset.page !== "gear") return;
    const f = firstImage(e.clipboardData && e.clipboardData.files);
    if (f) { e.preventDefault(); fill(f); }
  });
  const zone = $("gear-shot-zone");
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("drag"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", e => { e.preventDefault(); zone.classList.remove("drag"); fill(firstImage(e.dataTransfer.files)); });
}
