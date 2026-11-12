// "악세 세팅" 화면: 지금 낀 장비와 바꿔 볼 장비를 고르면 세트 효과까지 합친 DPS 변화를 보여 준다.
// 캐릭터 창 스크린샷을 올리면 아이콘을 알아봐서 "지금" 칸을 채운다.

import { $, esc, signed } from "./dom.js";
import { ACC_SLOTS, ACCESSORIES, NEW_ACCESSORIES, ARMOR_AVATARS, NEW_ARMOR_SETS, WEAPON_AVATARS, OUTFITS, ATMA, AVATAR_SET_LIMIT } from "../data/accessories.js";
import { ICONS } from "../data/icons.js";
import { compareGear, emptyGear, STAT_NAMES, IGNORED } from "../calc/gear.js";
import { findCharWindow, equipCells } from "../ocr/equip-window.js";
import { matchCell, isEmptySlot, decodeFeature, encodeFeature, featureDistance, KEEP_BACKGROUND, MAX_DISTANCE } from "../ocr/icons.js";

const KEY = "elsword-gear-v1", ICON_KEY = "elsword-gear-icons-v1";
const ALL_ACC = [...ACCESSORIES, ...NEW_ACCESSORIES];
const SAME = "=";   // "바꿔 보기"에서 그대로

// ----- 화면에 그릴 줄 -----
const ROWS = [
  { group: "avatar", title: "아바타 악세", slots: ACC_SLOTS.map(s => [s.key, s.name]) },
  { group: "normal", title: "일반 악세", slots: ACC_SLOTS.filter(s => s.key !== "ring").map(s => [s.key, s.name]).concat([["ring", "반지 1"], ["ring2", "반지 2"]]) },
  { group: "wear", title: "아바타", slots: [["outfit", "한 벌"], ["hair", "헤어"], ["top", "상의"], ["bottom", "하의"], ["gloves", "장갑"], ["shoes", "신발"], ["wavatar", "무기 아바타"]] },
];
const ATMA_GRADED = ATMA.pieces.filter(s => s !== "top");   // 만다라는 등급이 이름에 들어 있다
const SET_GRADES = ATMA.grades.slice(ATMA.grades.indexOf(ATMA.maxGrade));

/** 화면 표시용 짧은 이름 */
function shortName(name) {
  const m = name.match(/연화세계 정령왕의 (.+?) - OO의 (아트마|니르바나)(?:\((\S+), )?/);
  if (m) return m[1] === "만다라" ? `아트마 만다라 · ${m[2]} (${m[3]})` : `아트마 ${m[1]}`;
  return name;
}

/** (묶음, 부위)에 고를 수 있는 것: [[값, 표시 이름]] */
function choices(group, slot) {
  if (group === "avatar" || group === "normal") {
    const s = slot === "ring2" ? "ring" : slot;
    return ALL_ACC.filter(a => a.layer === group && a.slot === s).map(a => [a.name, shortName(a.name) + (a.unknown ? " (수치 모름)" : "")]);
  }
  if (slot === "outfit") return OUTFITS.map(o => [o.name, o.name]);
  if (slot === "wavatar") return WEAPON_AVATARS.map(w => [w.name, w.name]);
  return Object.keys(ARMOR_AVATARS).map(n => [n, n]).concat(NEW_ARMOR_SETS.map(n => [n, n + " (수치 모름)"]));
}

const sel = (side, group, slot) => $(`gear-${side}-${group}-${slot}`);
const options = (list, first) => first.concat(list).map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");

function buildTables() {
  let html = "";
  for (const row of ROWS) {
    html += `<div class="sub">${row.title}</div><div class="tbl-wrap"><table class="gear"><thead><tr><th>부위</th><th>지금</th><th>바꿔 보기</th></tr></thead><tbody>`;
    if (row.group === "normal") {
      const els = ATMA.elements.map(e => [e, e]);
      html += `<tr class="atma"><td class="lbl">아트마 속성</td>` +
        `<td><div class="pick"><select id="gear-now-element" aria-label="지금 아트마 속성">${options(els, [])}</select></div></td>` +
        `<td class="next"><div class="pick"><select id="gear-next-element" aria-label="바꿔 볼 아트마 속성">${options(els, [[SAME, "그대로"]])}</select></div></td></tr>`;
    }
    for (const [slot, name] of row.slots) {
      const list = choices(row.group, slot), grade = row.group === "normal" && ATMA_GRADED.includes(slot);
      const gradeSel = side => grade ? `<select class="grade" id="gear-${side}-grade-${slot}" aria-label="${name} 아트마 등급" hidden>${options(SET_GRADES.map(g => [g, g]), side === "next" ? [[SAME, "그대로"]] : [])}</select>` : "";
      html += `<tr><td class="lbl">${name}</td>` +
        `<td><div class="pick"><select id="gear-now-${row.group}-${slot}" aria-label="지금 ${row.title} ${name}">${options(list, [["", "미착용"]])}</select>${gradeSel("now")}</div></td>` +
        `<td class="next"><div class="pick"><select id="gear-next-${row.group}-${slot}" aria-label="바꿔 볼 ${row.title} ${name}">${options(list, [[SAME, "그대로"], ["", "미착용"]])}</select>${gradeSel("next")}</div></td></tr>`;
    }
    html += `</tbody></table></div>`;
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
  for (const row of ROWS) for (const [slot] of row.slots) {
    const v = val(row.group, slot) || null;
    if (row.group === "wear") { if (slot === "outfit") g.outfit = v; else if (slot === "wavatar") g.wavatar = v; else g.armor[slot] = v; }
    else g[row.group][slot] = v;
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

// ----- 무악 세트를 4개 이상 맞췄을 때 "지금" 켜 둔 세트 -----
let nowAvatarSets = null;

// ----- 결과 -----
/** 0.025 -> "+2.5%", -0.1 -> "−10%" (소수 둘째 자리까지, 뒤의 0은 뗀다) */
const pctText = v => signed(v, 2).replace(/(\.\d*?)0+%$/, "$1%").replace(/\.%$/, "%");
const stagesText = s => `${s.count}개 (${s.stages.join("·")}세트)`;

export function renderGear({ win, job, resist, setup }) {
  syncGrades();
  const out = $("gear-out");
  if (!Object.keys(win).some(k => k !== "share_cho" && k !== "share_gang")) {
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

  // 바뀌는 수치
  const rows = Object.entries(r.delta).map(([k, v]) => [STAT_NAMES[k] || k, pctText(v)]);
  const prod = xs => xs.reduce((a, x) => a * (1 + x), 1);
  const cd = prod(r.hidden.cd[1]) / prod(r.hidden.cd[0]) - 1, fin = prod(r.hidden.final[1]) / prod(r.hidden.final[0]) - 1;
  if (Math.abs(cd) > 1e-9) rows.push(["크뎀 곱연산 (스탯창에 안 보임)", pctText(cd)]);
  if (Math.abs(fin) > 1e-9) rows.push(["최종 데미지 (스탯창에 안 보임)", pctText(fin)]);
  if (rows.length) html += `<div class="sub">바뀌는 수치</div><table class="gear-out"><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join("")}</tbody></table>`;

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

function saveGear() {
  const s = { v: 1, sel: Object.fromEntries(allSelects().map(e => [e.id, e.value])), avatarSets: nowAvatarSets };
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장이 막힌 환경 */ }
}
function loadGear() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s) return;
    for (const e of allSelects()) if (s.sel && e.id in s.sel && [...e.options].some(o => o.value === s.sel[e.id])) e.value = s.sel[e.id];
    nowAvatarSets = Array.isArray(s.avatarSets) ? s.avatarSets : null;
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

// 스크린샷 칸 -> 화면의 줄, 기준표의 부위
const rowOf = c => c.group === "avatar" || c.group === "normal" ? [c.group, c.slot] : c.group === "outfit" ? ["wear", "outfit"] : c.group === "wavatar" ? ["wear", "wavatar"] : ["wear", c.slot];
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
    for (const c of equipCells(win)) {
      const [group, slot] = rowOf(c), el = sel("now", group, slot);
      if (isEmptySlot(data, width, c.box)) { el.value = ""; el.classList.add("filled"); empty++; continue; }
      const cand = refs.filter(r => r.g === c.group && r.s === refSlot(c));
      const m = matchCell(data, width, c.box, cand, { keepBackground: KEEP_BACKGROUND.has(c.group) });
      lastShot[el.id] = { g: c.group, s: refSlot(c), f: m ? m.feature : null };
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
  loadGear();
  const tables = $("gear-tables");
  tables.addEventListener("change", e => {
    const t = e.target;
    if (t.classList) t.classList.remove("filled", "check");
    if (t.id && t.id.startsWith("gear-now-") && lastShot[t.id] && lastShot[t.id].f) {   // 사용자가 고친 칸의 아이콘을 기억
      const { g, s, f } = lastShot[t.id];
      learn(g, s, t.value, f);
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
  $("gear-reset-next").addEventListener("click", () => {
    for (const e of allSelects()) if (e.id.startsWith("gear-next-")) e.value = SAME;
    saveGear(); onChange();
  });
  $("gear-clear").addEventListener("click", () => {
    for (const e of allSelects()) if (e.id.startsWith("gear-now-")) { e.value = e.id.includes("-grade-") ? "유니크" : e.id.endsWith("-element") ? "유수" : ""; e.classList.remove("filled", "check"); }
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
