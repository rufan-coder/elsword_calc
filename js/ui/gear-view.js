// "악세 세팅" 화면: 지금 낀 장비와 바꿔 볼 장비를 고르면 세트 효과까지 합친 DPS 변화를 보여 준다.
// 캐릭터 창 스크린샷을 올리면 아이콘을 알아봐서 "지금" 칸을 채운다.

import { $, esc, signed, trimPct } from "./dom.js";
import { ACC_SLOTS, ACCESSORIES, NEW_ACCESSORIES, ARMOR_AVATARS, WEAPON_AVATARS, OUTFITS, WEAPONS, ATMA, AVATAR_SET_LIMIT } from "../data/accessories.js";
import { ICONS } from "../data/icons.js";
import { compareGear, emptyGear, STAT_NAMES, IGNORED, EQUIP_PARTS } from "../calc/gear.js";
import { ARMOR_TYPES, ARMOR_SETS, ARMOR_REROLL } from "../data/equipment.js";
import { optimizeGear, townsToTry, sortByTown, OVER_PENALTY } from "../calc/gear-optimize.js";
import { TOWN_BUFFS, BUFF_ITEMS, MAX_ENHANCE } from "../data/buffs.js";
import { capOver, CAP_NOTES } from "../calc/caps.js";
import { SWAP_STONES } from "../data/stones.js";
import { findCharWindow, equipCells } from "../ocr/equip-window.js";
import { matchCell, isEmptySlot, decodeFeature, encodeFeature, featureDistance, KEEP_BACKGROUND, MAX_DISTANCE } from "../ocr/icons.js";

const KEY = "elsword-gear-v1", ICON_KEY = "elsword-gear-icons-v1";
const ALL_ACC = [...ACCESSORIES, ...NEW_ACCESSORIES];
const SAME = "=";   // "바꿔 보기"에서 그대로

// ----- 화면에 그릴 줄 -----
const slotName = s => (s.key === "weapon" ? "무기 악세" : s.name);   // 무기 아바타·무기 종류와 헷갈리지 않게
// 줄 하나: [묶음, 부위, 이름]. 묶음 wear 는 한 벌·5셋(레어 아바타 다섯 부위)·무기 아바타, town 은 마을 버프, spirit 은 아티팩트 정령석
const TABLES = [
  { title: "무기 · 마을 버프 · 정령석", rows: [["weapon", "weapon", "무기 종류"], ["town", "town", "마을 버프"], ["spirit", "spirit", "아티팩트 정령석"]] },
  { title: "아바타 악세", rows: [["wear", "outfit", "한 벌"], ["wear", "set5", "5셋"], ["wear", "wavatar", "무기 아바타"], ...ACC_SLOTS.map(s => ["avatar", s.key, slotName(s)])] },
  { title: "일반 악세", atma: true, rows: ACC_SLOTS.filter(s => s.key !== "ring").map(s => ["normal", s.key, slotName(s)]).concat([["normal", "ring", "반지 1"], ["normal", "ring2", "반지 2"]]) },
];
const ROWS = TABLES.flatMap(t => t.rows);
/** 줄의 "고정" 이름 (자동 찾기의 LOCKABLE 과 같은 이름). 무기 종류는 늘 그대로라 없다 */
const lockKey = (group, slot) => group === "weapon" ? null : group === "town" || group === "spirit" ? group : group === "wear" ? (slot === "set5" ? "armor" : slot) : `${group}.${slot}`;
/**
 * 처음 쓸 때 "고정"에 체크해 두는 칸. 일반 악세는 레이드 세트·아트마로 거의 정해져 있어서 하의만 바꿔 본다
 * (아바타 악세로 DPS를 올리다 적응력이 모자라면 족쇄 -> 글로잉 플라워, 넘치면 그 반대로 바꾸는 경우가 대부분이라)
 */
const DEFAULT_LOCKS = ["element", "normal.weapon", "normal.support", "normal.face_top", "normal.face_mid", "normal.face_low", "normal.top", "normal.arm", "normal.ear", "normal.neck", "normal.ring", "normal.ring2"];
const LOCK_VERSION = 2;   // 기본 고정이 바뀌면 올린다 (저장된 일반 악세 고정을 한 번 기본값으로 맞춘다)
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
  if (group === "town") return Object.keys(TOWN_BUFFS).map(n => [n, n]);
  if (group === "spirit") return SPIRIT_CHOICES;
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

/** 아티팩트 정령석: 값 = 양극화로 고른 개수 */
const SPIRIT_CHOICES = [["0", "물마 2% ×2"], ["1", "물마 2% + 양극화 2%"], ["2", "양극화 2% ×2"]];

const sel = (side, group, slot) => $(`gear-${side}-${group}-${slot}`);
const options = (list, first) => first.concat(list).map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");

// ----- 방어구 (종류·강화·재련, 4세트) -----
const PART_NAMES = { top: "상의", bottom: "하의", gloves: "장갑", shoes: "신발" };
const TYPE_SHORT = { "엑사스케일": "엑사", "테네브로스": "테네" };   // 칸이 좁아서 줄여 쓴다
const EQ_DEFAULT = { enh: "11", ref: "0" };   // 처음 값 (하의·신발 강화는 버프 세팅 값을 따른다)
const ENH_SLOTS = [["bottom", "pants"], ["shoes", "shoes"]];   // 방어구 "지금" 하의·신발 강화 = 버프 세팅의 하의·신발 강화
const eqSel = (side, key) => $(`gear-${side}-eq-${key}`);
const setLabel = name => name.replace("-(", " (");
const range = (n, unit) => Array.from({ length: n + 1 }, (_, i) => [String(i), i + unit]);
const REFORGE_MAX = Math.min(...Object.values(ARMOR_TYPES).map(t => t.reforge.length)) - 1;
// 네블론 옵션 변환 (부위마다 3줄). DPS에 들어가는 옵션만 고르고, 나머지는 "없음·그 밖"
const NEBULON = "네블론", OPT_LINES = [1, 2, 3], STEP_MAX = "10";
const REROLL_SHORT = {
  "강화 1당 물마공 (%)": "강화당 물마공%", "강화 1당 크리티컬 데미지": "강화당 크뎀", "강화 1당 모든 스킬 데미지": "강화당 모스뎀",
  "추가 지속 피해": "추피", "물마공 (%)": "물마공%", "HP 전 구간 공격뎀": "HP 전 구간 뎀", "크리티컬 데미지": "크뎀", "보스에게 주는 피해": "보뎀",
  "강렬한 스킬 데미지": "강렬스뎀", "초월한 스킬 데미지": "초스뎀", "모든 스킬 데미지": "모스뎀", "크리티컬": "크리", "극대화": "극대",
};
const REROLL_CHOICES = Object.keys(ARMOR_REROLL).filter(n => ARMOR_REROLL[n].stat).map(n => [n, REROLL_SHORT[n] || n]);
const stepText = v => +(v * 100).toFixed(3) + "%";

function equipTable() {
  const types = Object.keys(ARMOR_TYPES).map(t => [t, TYPE_SHORT[t] || t]), sets = Object.keys(ARMOR_SETS).map(n => [n, setLabel(n)]);
  const first = side => side === "next" ? [[SAME, "그대로"]] : [];
  const part = (side, p) => `<div class="pick eq">` +
    `<select id="gear-${side}-eq-${p}-type" aria-label="${side === "now" ? "지금" : "바꿔 볼"} ${PART_NAMES[p]} 종류">${options(types, side === "now" ? [["", "미입력"]] : first(side))}</select>` +
    `<select class="n" id="gear-${side}-eq-${p}-enh" aria-label="${PART_NAMES[p]} 강화">${options(range(MAX_ENHANCE, "강"), first(side))}</select>` +
    `<select class="n" id="gear-${side}-eq-${p}-ref" aria-label="${PART_NAMES[p]} 재련">${options(range(REFORGE_MAX, "재련"), first(side))}</select></div>`;
  const steps = Array.from({ length: +STEP_MAX }, (_, i) => [String(i + 1), `${i + 1}단계`]);
  const opts = (side, p) => `<div class="eq-opts" id="gear-${side}-eq-${p}-opts">` + OPT_LINES.map(i => `<div class="pick eq">` +
    `<select id="gear-${side}-eq-${p}-o${i}" aria-label="${side === "now" ? "지금" : "바꿔 볼"} ${PART_NAMES[p]} 옵션 변환 ${i}줄">${options(REROLL_CHOICES, side === "now" ? [["", "없음·그 밖"]] : [[SAME, "그대로"], ["", "없음·그 밖"]])}</select>` +
    `<select class="n" id="gear-${side}-eq-${p}-s${i}" aria-label="${PART_NAMES[p]} 옵션 변환 ${i}줄 수치">${options(steps, [])}</select></div>`).join("") + `</div>`;
  let html = `<div class="sub">방어구</div><div class="tbl-wrap"><table class="gear eq"><thead><tr><th>부위</th><th>지금</th><th>바꿔 보기</th><th class="lock"></th></tr></thead><tbody>`;
  for (const p of EQUIP_PARTS) {
    html += `<tr><td class="lbl">${PART_NAMES[p]}</td><td>${part("now", p)}</td><td class="next">${part("next", p)}</td><td class="lock"></td></tr>`;
    html += `<tr class="eq-opt" id="gear-eq-${p}-optrow" hidden><td class="lbl" title="${PART_NAMES[p]} 옵션 변환">옵변</td><td>${opts("now", p)}</td><td class="next">${opts("next", p)}</td><td class="lock"></td></tr>`;
  }
  html += `<tr><td class="lbl">4세트</td>` +
    `<td><div class="pick"><select id="gear-now-eq-set" aria-label="지금 방어구 세트">${options(sets, [["", "입력 안 함"]])}</select></div></td>` +
    `<td class="next"><div class="pick"><select id="gear-next-eq-set" aria-label="바꿔 볼 방어구 세트">${options(sets, [[SAME, "그대로"]])}</select></div></td><td class="lock"></td></tr>`;
  html += `</tbody></table></div>` +
    `<p class="hint">엑사 = 엑사스케일, 테네 = 테네브로스. 지금 낀 방어구의 종류·강화·재련과 세트를 넣고, 바꿔 볼 쪽을 고르면 그 차이를 계산해요. "지금" 종류를 넣은 부위만 계산해요. 세트 효과는 네 부위가 모두 그 세트를 쓸 수 있는 방어구일 때만 켜져요.</p>` +
    `<p class="hint">네블론을 고르면 그 부위의 옵션 변환 3줄을 넣는 칸이 생겨요. 수치는 합연으로 더하고, "강화당" 옵션은 그 부위 강화 수치를 곱해요. DPS에 안 들어가는 옵션은 "없음·그 밖"으로 두세요.</p>` +
    `<p class="hint">네블론은 부위마다 소켓이 1칸 더 있어요. 네블론 부위 수가 바뀌면 늘어난 칸에 크리 6%·극대 6%·"소켓 교체 기준" 마법석 중 DPS가 가장 높은 것을 끼워서 계산해요 (줄면 손해가 가장 적은 것을 빼요).</p>` +
    `<p class="hint">하의·신발 강화는 버프 세팅의 하의·신발 강화 수치와 같은 칸이에요 (한쪽을 바꾸면 다른 쪽도 바뀌어요). 고정 공격력·카트리지는 계산하지 않아요. 자동 찾기는 방어구를 바꾸지 않고, "바꿔 보기"의 방어구를 낀 채로 악세를 찾아요.</p>`;
  return html;
}

/** 옵션 변환 한 줄: { name, step } 또는 null. "바꿔 보기"의 그대로는 지금 줄 (지금이 네블론이 아니면 없음) */
function rerollLine(side, p, i) {
  const o = eqSel(side, `${p}-o${i}`).value;
  if (side === "next" && o === SAME) return eqSel("now", `${p}-type`).value === NEBULON ? rerollLine("now", p, i) : null;
  return o && ARMOR_REROLL[o] ? { name: o, step: +eqSel(side, `${p}-s${i}`).value } : null;
}

/** 방어구: "지금" 종류를 넣은 부위만. 아무것도 안 넣었으면 null */
function readEquip(side) {
  const v = key => { const x = eqSel(side, key).value; return side === "next" && x === SAME ? eqSel("now", key).value : x; };
  const eq = { set: v("set") || null };
  for (const p of EQUIP_PARTS) {
    const type = eqSel("now", `${p}-type`).value ? v(`${p}-type`) : "";
    eq[p] = type ? { type, enh: +v(`${p}-enh`), ref: +v(`${p}-ref`) } : null;
    if (type === NEBULON) eq[p].opts = OPT_LINES.map(i => rerollLine(side, p, i)).filter(Boolean);
  }
  return EQUIP_PARTS.some(p => eq[p]) || eq.set ? eq : null;
}

/** 옵션 변환 칸: 네블론인 쪽만 보이고, 수치 칸은 고른 옵션의 단계 수치로 이름을 바꾼다 */
function syncEquip() {
  for (const p of EQUIP_PARTS) {
    const nowType = eqSel("now", `${p}-type`).value, nx = eqSel("next", `${p}-type`).value;
    const nextType = nowType ? (nx === SAME ? nowType : nx) : "";
    $(`gear-eq-${p}-optrow`).hidden = nowType !== NEBULON && nextType !== NEBULON;
    $(`gear-now-eq-${p}-opts`).hidden = nowType !== NEBULON;
    $(`gear-next-eq-${p}-opts`).hidden = nextType !== NEBULON;
    // "바꿔 보기"의 그대로: 지금이 네블론이 아니면 옮겨 올 줄이 없어서 "골라 주세요" (계산은 없음)
    for (const i of OPT_LINES) eqSel("next", `${p}-o${i}`).options[0].textContent = nowType === NEBULON ? "그대로" : "골라 주세요";
    for (const side of ["now", "next"]) for (const i of OPT_LINES) {
      const o = eqSel(side, `${p}-o${i}`).value, s = eqSel(side, `${p}-s${i}`), def = o !== SAME && ARMOR_REROLL[o];
      s.hidden = !def;
      if (def && s.dataset.for !== o) {
        [...s.options].forEach((opt, j) => { opt.textContent = stepText(def.steps[j]); });
        s.dataset.for = o;
      }
    }
  }
}

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
      if (group === "town") {   // 지금 = 스펙 계산에서 고른 버프 (여기서는 못 바꾼다)
        html += `<tr><td class="lbl">${name}</td>` +
          `<td><div class="pick"><select id="gear-now-town-town" aria-label="지금 마을 버프" title="스펙 계산에서 바꿔요" disabled>${options(list, [])}</select></div></td>` +
          `<td class="next"><div class="pick"><select id="gear-next-town-town" aria-label="바꿔 볼 마을 버프">${options(list, [[SAME, "그대로"]])}</select></div></td>${lockCell("town", name)}</tr>`;
        continue;
      }
      const none = group === "weapon" ? "그 밖의 무기" : group === "spirit" ? "입력 안 함" : "미착용";
      const nextFirst = group === "spirit" ? [[SAME, "그대로"]] : [[SAME, "그대로"], ["", none]];   // 정령석은 빼는 경우가 없다
      html += `<tr><td class="lbl">${name}</td>` +
        `<td><div class="pick"><select id="gear-now-${group}-${slot}" aria-label="지금 ${table.title} ${name}">${options(list, [["", none]])}</select>${gradeSel("now")}</div></td>` +
        `<td class="next"><div class="pick"><select id="gear-next-${group}-${slot}" aria-label="바꿔 볼 ${table.title} ${name}">${options(list, nextFirst)}</select>${gradeSel("next")}</div></td>${lockCell(lockKey(group, slot), `${table.title} ${name}`)}</tr>`;
    }
    html += `</tbody></table></div>`;
    const first = table.rows.some(r => r[0] === "town");
    if (first) html += `<p class="hint">레이드 무기는 같은 레이드 악세 세트 개수에 들어가요 (사룡무 → 공중요새의 유산, 암귀무 → 심연 레이드 세트). 스크린샷으로는 채우지 않으니 직접 골라 주세요. 자동 찾기에서도 무기 종류는 그대로 둬요.</p>` +
      `<p class="hint">마을 버프 "지금"은 스펙 계산에서 고른 버프예요. 바꿔 보기에서 다른 버프를 고르면 그 버프로 계산해요 (적응력은 60% 상한에 같이 들어가요). 자동 찾기는 "고정"이 아니면 버프마다 따로 찾아서 비교해요.</p>` +
      `<p class="hint">아티팩트 정령석은 두 개를 각각 물마(물리·마법 공격력) 2% 또는 양극화 2%로 바꿀 수 있어요. 지금 낀 것을 골라 두면 자동 찾기가 같이 골라 줘요 (양극화가 60%를 넘으면 물마로 바꾸는 식). "입력 안 함"이면 계산에서 빼요.</p>`;
    if (table.title === "아바타 악세") html += `<p class="hint">5셋은 레어 아바타 헤어·상의·하의·장갑·신발을 한 세트로 맞춰 입은 것이에요.</p>`;
    if (first) html += equipTable();
  }
  $("gear-tables").innerHTML = html;
  for (const p of EQUIP_PARTS) {
    eqSel("now", `${p}-enh`).value = EQ_DEFAULT.enh; eqSel("now", `${p}-ref`).value = EQ_DEFAULT.ref;
    for (const side of ["now", "next"]) for (const i of OPT_LINES) eqSel(side, `${p}-s${i}`).value = STEP_MAX;
  }
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
    if (group === "town") {   // 지금 버프와 같으면 null (= 스펙 계산의 버프 그대로)
      const v = side === "next" ? sel("next", "town", "town").value : SAME;
      g.town = v === SAME || v === $("town").value ? null : v;
      continue;
    }
    const v = val(group, slot) || null;
    if (group === "spirit") { g.spirit = v == null ? null : +v; continue; }
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
  g.equip = readEquip(side);
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
    if (group === "town") { sel("next", "town", "town").value = g.town || SAME; continue; }
    if (group === "spirit") { sel("next", "spirit", "spirit").value = g.spirit == null || g.spirit === now.spirit ? SAME : String(g.spirit); continue; }
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

let lastCtx = null;
let lastTownResults = null;   // 마지막 자동 찾기의 마을 버프별 결과   // 자동 찾기가 쓰는 마지막 스탯창·버프 값
const hasWindow = win => Object.keys(win).some(k => k !== "share_cho" && k !== "share_gang");

/** 상한을 넘은 양: 빨간 글씨 "1% 초과" (크리·극대화는 실전 값 기준, 점감 포화는 소켓 수치 기준) */
const OVER_PREFIX = { crit: "실전 ", maxi: "실전 ", crit_sat: "점감 ", maxi_sat: "점감 " };
const overSpan = (over, k) => over[k] ? `<span class="over" title="${esc(CAP_NOTES[k])}">${OVER_PREFIX[k] || ""}${trimPct(over[k])} 초과</span>` : "";

/** 지킬 초월 쿨감: 입력칸 값, 비었으면 스탯창 값. 스탯창에 초월 쿨감이 없으면 null (지킬 수 없음) */
function cdrTarget(win) {
  if (typeof win.cdr_cho !== "number") return null;
  const v = parseFloat($("gear-cdr-target").value);
  return isFinite(v) ? v / 100 : win.cdr_cho;
}
/** 초월 쿨감이 목표보다 낮으면 빨간 글씨 "목표보다 2% 낮음" */
const shortSpan = (cdr, target) => target != null && cdr < target - 1e-9 ? `<span class="over" title="초월 쿨감 목표 ${trimPct(target)}">목표보다 ${trimPct(target - cdr)} 낮음</span>` : "";

/** 크리·극대 소켓 기준: 켜져 있으면 크리·극대 마법석 대신 끼울 마법석 ("소켓 교체 기준"에서 고른 것) */
function socketRule() {
  if (!$("gear-ckb-sockets").checked) return null;
  return { partners: [slotStone()] };
}
/** "소켓 교체 기준"에서 고른 마법석 (네블론 소켓 후보로도 쓴다) */
function slotStone() {
  const stone = SWAP_STONES.find(x => x.key === $("gear-socket-stone").value) || SWAP_STONES[0];
  return { name: stone.name, stats: stone.stats };
}
/** 소켓 교체를 교체 결과 스탯창에 반영할지 */
let applySockets = false;
const SOCKET_STAT = { crit: "크리", maxi: "극대" };

export function renderGear({ win, job, resist, setup, town }) {
  lastCtx = { win, job, resist, setup, town, sockets: socketRule(), slotStone: slotStone() };
  sel("now", "town", "town").value = town;
  syncGrades();
  syncEquip();
  const hasCdr = typeof win.cdr_cho === "number";
  $("gear-cdr-target").placeholder = hasCdr ? String(+(win.cdr_cho * 100).toFixed(2)) : "";
  $("gear-cdr-hint").textContent = hasCdr ? `비워 두면 스탯창 값(${trimPct(win.cdr_cho)})을 써요` : "스펙 계산에 초월한 스킬 재사용 시간 감소를 넣어야 지킬 수 있어요";
  const out = $("gear-out");
  if (!hasWindow(win)) {
    out.innerHTML = `<p class="hint">먼저 <a href="#spec">스펙 계산</a>에 스탯창 값을 넣어 주세요. 그 값을 기준으로 바꿨을 때의 차이를 계산해요.</p>`;
    $("gear-float").hidden = true;
    return;
  }
  const r = compareGear(lastCtx, readGear("now"), readGear("next"));
  const changed = JSON.stringify(readGear("now")) !== JSON.stringify(Object.assign(readGear("next"), { avatarSets: nowAvatarSets }));
  const float = $("gear-float");
  float.hidden = !changed;
  float.innerHTML = `<span>DPS 변화</span><b class="${r.gain > 1e-9 ? "up" : r.gain < -1e-9 ? "down" : ""}">${signed(r.gain)}</b><a href="#gear-results">자세히</a>`;
  let html = `<div class="gear-gain ${r.gain > 1e-9 ? "up" : r.gain < -1e-9 ? "down" : ""}"><span class="v">${changed ? signed(r.gain) : "±0%"}</span><span class="k">DPS 변화 (지금 세팅 대비)</span></div>`;
  if (!changed) html += `<p class="hint">"바꿔 보기"에서 부위를 골라 보세요. 세트 효과가 켜지고 꺼지는 것까지 함께 계산해요.</p>`;

  // 소켓 교체 (크리·극대 소켓 기준으로 계산에 넣은 교체)
  const swaps = r.swaps || [];
  if (swaps.length) {
    const by = new Map();
    for (const x of swaps) {
      const key = x.k === "slot" ? (x.dir > 0 ? `네블론 소켓 늘어남 → ${x.name}` : `${x.name} 빼기 (네블론 소켓 줄어듦)`)
        : x.dir < 0 ? `${SOCKET_STAT[x.k]} 6% → ${x.name}` : `${x.name} → ${SOCKET_STAT[x.k]} 6%`;
      by.set(key, (by.get(key) || 0) + 1);
    }
    html += `<div class="socket-rec"><div class="k">소켓 교체 · 위 DPS 변화에 들어 있어요</div><ul>${[...by].map(([t, n]) => `<li>${esc(t)} <b>${n}칸</b></li>`).join("")}</ul>` +
      `<label><input type="checkbox" id="gear-apply-sockets"${applySockets ? " checked" : ""}> 아래 스탯창(바꾼 뒤)에 소켓 교체 반영</label></div>`;
  }

  // 세트 효과
  const names = [...new Set([...r.before.sets, ...r.after.sets].map(s => s.name))];
  const cell = s => !s ? `<span class="muted">-</span>` : s.active ? stagesText(s) : `<span class="muted">${stagesText(s)} · 꺼짐</span>`;
  const atmaCell = a => a.grade ? (a.active ? `${a.element} · ${a.grade} (${a.count}개)` : `<span class="muted">${a.element} · 효과 없음</span>`) : `<span class="muted">${a.count}개 (4개부터)</span>`;
  const eqCell = s => !s ? `<span class="muted">-</span>` : s.active ? esc(setLabel(s.name)) : `<span class="muted">${esc(setLabel(s.name))} · 꺼짐</span>`;
  const eqSet = r.before.equipSet || r.after.equipSet;
  if (names.length || r.before.atma.count || r.after.atma.count || eqSet) {
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
    if (eqSet) {
      const diff = JSON.stringify(r.before.equipSet) !== JSON.stringify(r.after.equipSet);
      html += `<tr class="${diff ? "diff" : ""}"><td>방어구 4세트</td><td>${eqCell(r.before.equipSet)}</td><td>${eqCell(r.after.equipSet)}</td></tr>`;
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
  const after = applySockets && swaps.length && r.real ? r.real : r.win, stat = x => (x * 100).toFixed(2) + "%";
  const overNow = capOver(win, setup, job, resist), overAfter = capOver(after, r.setup, job, resist), target = cdrTarget(win);
  const mark = (w, over, k) => overSpan(over, k) + (k === "crit" || k === "maxi" ? overSpan(over, k + "_sat") : "") + (k === "cdr_cho" ? shortSpan(w[k], target) : "");
  const lines = WINDOW_STATS.filter(([k]) => typeof win[k] === "number").map(([k, name]) => {
    const d = after[k] - win[k], diff = Math.abs(d) > 5e-5;
    return `<tr class="${diff ? "diff" : ""}"><td>${name}</td><td class="num">${stat(win[k])}${mark(win, overNow, k)}</td><td class="num">${stat(after[k])}${mark(after, overAfter, k)}</td><td class="num">${diff ? pctText(d).replace("%", "%p") : ""}</td></tr>`;
  });
  const prod = xs => xs.reduce((a, x) => a * (1 + x), 1), mult = x => "x" + x.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  const hidden = [["크뎀 곱연산", prod(r.hidden.cd[0]), prod(r.hidden.cd[1])], ["최종 데미지", prod(r.hidden.final[0]), prod(r.hidden.final[1])]];
  for (const [name, b, a] of hidden) {
    const diff = Math.abs(a / b - 1) > 1e-9;
    lines.push(`<tr class="hidden-stat ${diff ? "diff" : ""}"><td>${name} <span class="muted">(스탯창에 안 보임)</span></td><td class="num">${mult(b)}</td><td class="num">${mult(a)}</td><td class="num">${diff ? pctText(a / b - 1) : ""}</td></tr>`);
  }
  html += `<div class="sub">스탯창 (지금 → 바꾼 뒤)</div><div class="tbl-wrap"><table class="gear-out stats"><thead><tr><th>스탯</th><th class="num">지금</th><th class="num">바꾼 뒤</th><th class="num">변화</th></tr></thead><tbody>${lines.join("")}</tbody></table></div>` +
    `<p class="hint">크리티컬·극대화는 점감이 다시 걸린 값이에요. 곱연 크뎀과 최종 데미지는 장비에서 나오는 배율만 따로 보여 줘요.` +
    (Object.keys(overNow).length || Object.keys(overAfter).length ? ` <span class="over">빨간 글씨</span>는 상한을 넘어서 DPS에 도움이 안 되는 만큼이에요 (적응력은 마을 버프 포함).` : "") +
    (hasCdr ? ` 쿨감은 DPS에 넣지 않아요. 초월 쿨감이 목표(${trimPct(target)})보다 낮아지면 빨간 글씨로 알려 줘요.` : "") + `</p>`;

  // 알림
  const notes = [];
  if (r.blank.length) notes.push(`스펙 계산의 ${r.blank.map(k => `"${STAT_NAMES[k] || k}"`).join(", ")} 칸이 비어 있어 이 변화는 계산에서 빠졌어요.`);
  const ign = Object.entries(r.ignored).filter(([, v]) => Math.abs(v) > 1e-9);
  if (ign.length) notes.push(`계산에 넣지 않은 옵션: ${ign.map(([k, v]) => `${IGNORED[k]} ${pctText(v)}`).join(", ")}`);
  const unknown = [...new Set([...r.before.unknown, ...r.after.unknown])];
  if (unknown.length) notes.push(`수치를 모르는 아이템은 효과가 없는 것으로 계산했어요: ${unknown.join(", ")}`);
  if (swaps.length && applySockets) notes.push("스탯창의 \"바꾼 뒤\"는 소켓 교체까지 반영한 값이에요.");
  if ([r.before.atma, r.after.atma].some(a => a.grade && !a.active)) notes.push("이 속성의 아트마 세트 효과는 데이터에 없어서 계산하지 않았어요.");
  if (["now", "next"].some(side => { const g = readGear(side); return g.normal.ring && g.normal.ring === g.normal.ring2; })) notes.push("같은 반지는 두 개 낄 수 없어요. 반지 1과 반지 2를 다르게 골라 주세요.");
  const pm = (k, name) => { const b = lastCtx.setup[k][0], a = r.setup[k][0]; return Math.abs(a - b) > 1e-9 ? `${name} ×${trimPct(b)} → ×${trimPct(a)}` : ""; };
  const partMult = [pm("crit_mults", "하의 크리티컬 곱연산"), pm("maxi_mults", "신발 극대화 곱연산")].filter(Boolean);
  if (partMult.length) notes.push(`방어구 강화가 바뀌어서 ${partMult.join(", ")}(으)로 계산했어요. 그 방어구로 바꿨다면 버프 세팅의 하의·신발 강화도 바뀌어요 (악세 세팅 "지금" 칸을 바꾸면 같이 바뀌어요).`);
  if (Math.abs((r.after.fixedAtk || 0) - (r.before.fixedAtk || 0)) > 1e-9) notes.push(`방어구 재련 고정 공격력 ${(r.before.fixedAtk || 0).toLocaleString("ko-KR")} → ${(r.after.fixedAtk || 0).toLocaleString("ko-KR")}은 계산에 넣지 않았어요.`);
  const eqMissing = EQUIP_PARTS.filter(p => !eqSel("now", `${p}-type`).value && ![SAME, ""].includes(eqSel("next", `${p}-type`).value)).map(p => PART_NAMES[p]);
  if (eqMissing.length) notes.push(`방어구 ${eqMissing.join("·")}는 "지금" 종류를 넣지 않아서 계산에서 빠졌어요.`);
  const nextTown = readGear("next").town;
  if (nextTown) notes.push(`마을 버프를 "${nextTown}"(으)로 바꿔서 계산했어요. 그 버프를 쓰기로 했다면 스펙 계산의 마을 버프도 바꿔 주세요 (그래야 다음에 비교할 때 "지금"이 맞아요).`);
  if (notes.length) html += `<ul class="notes">${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
  out.innerHTML = html;
}

// ----- 버프 세팅의 버프형 아이템(얼굴 상단·귀걸이)과 "지금" 일반 악세를 같은 값으로 맞춘다 -----
// 둘 다 실제로 낀 일반 악세라서, 한쪽만 바꾸면 스펙 계산과 악세 세팅의 실전 크뎀이 서로 달라진다.
const BUFF_SLOTS = [["face_top", "acc_face_top"], ["ear", "acc_ear"]];
let buffSynced = null;   // 마지막으로 맞춘 버프 세팅 값. null 이면 다음에는 "지금" 칸 값을 따른다
/**
 * 화면을 다시 그릴 때마다 부른다. 지난번에 맞춘 뒤 버프 세팅 쪽을 바꿨으면 "지금" 칸을 바꾸고, 아니면 버프 세팅 칸을 "지금" 칸에 맞춘다.
 * "지금" 칸이 버프형 아이템이 아닌 것(예: 타마칸의 인장)이면 버프 세팅은 "해당사항 없음"이다.
 */
export function syncBuffItems() {
  const prev = buffSynced;
  let changed = false;
  buffSynced = {};
  for (const [slot, id] of BUFF_SLOTS) {
    const g = sel("now", "normal", slot), b = $(id);
    if (!g || !b) continue;
    const fromGear = BUFF_ITEMS[slot][g.value] ? g.value : "";
    if (b.value !== fromGear) {
      if (prev && b.value !== prev[slot]) { g.value = b.value; changed = true; }
      else b.value = fromGear;
    }
    buffSynced[slot] = b.value;
  }
  for (const [part, id] of ENH_SLOTS) {   // 방어구 하의·신발 강화
    const g = eqSel("now", `${part}-enh`), b = $(id);
    if (!g || !b) continue;
    if (b.value !== g.value) {
      if (prev && b.value !== prev[id]) { g.value = b.value; changed = true; }
      else b.value = g.value;
    }
    buffSynced[id] = b.value;
  }
  if (changed) { syncGrades(); saveGear(); }
}
/** 다음 syncBuffItems 에서 버프 세팅을 "지금" 칸 값으로 맞춘다 (스펙 계산을 예시로 되돌렸을 때 악세 세팅을 지우지 않게) */
export function resyncBuffItems() { buffSynced = null; }

// ----- 저장 -----
function allSelects() { return [...document.querySelectorAll("#gear-tables select")]; }

const DEFAULT_WEAPON = "사룡무";

function saveGear() {
  const s = { v: 2, sel: Object.fromEntries(allSelects().map(e => [e.id, e.value])), avatarSets: nowAvatarSets, locks: readLocks(), lockVersion: LOCK_VERSION, cdrTarget: $("gear-cdr-target").value, ckbSockets: $("gear-ckb-sockets").checked, socketStone: $("gear-socket-stone").value, applySockets };
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장이 막힌 환경 */ }
}
/** 기본 고정: 일반 악세 쪽은 DEFAULT_LOCKS 대로, 아바타 쪽은 keep 에 있는 것만 */
function applyDefaultLocks(keep = []) {
  for (const e of document.querySelectorAll("#gear-tables input[data-lock]")) {
    const k = e.dataset.lock, normalSide = k === "element" || k.startsWith("normal.");
    e.checked = normalSide ? DEFAULT_LOCKS.includes(k) : keep.includes(k);
  }
}

/** 저장된 값을 화면에 넣는다. 반환: 저장된 값으로 채운 칸 id */
function loadGear() {
  applyDefaultLocks();
  const restored = new Set();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s) return restored;
    if (s.v === 1 && s.sel && s.sel["gear-now-weapon-weapon"] === "") delete s.sel["gear-now-weapon-weapon"];   // 무기 기본값(사룡무)이 없던 때
    for (const e of allSelects()) if (s.sel && e.id in s.sel && [...e.options].some(o => o.value === s.sel[e.id])) { e.value = s.sel[e.id]; restored.add(e.id); }
    nowAvatarSets = Array.isArray(s.avatarSets) ? s.avatarSets : null;
    if (Array.isArray(s.locks)) {
      if ((s.lockVersion || 1) < LOCK_VERSION) applyDefaultLocks(s.locks);   // 기본 고정이 바뀐 뒤 처음: 일반 악세 쪽만 기본값으로
      else for (const e of document.querySelectorAll("#gear-tables input[data-lock]")) e.checked = s.locks.includes(e.dataset.lock);
    }
    if (typeof s.cdrTarget === "string") $("gear-cdr-target").value = s.cdrTarget;
    if (typeof s.ckbSockets === "boolean") $("gear-ckb-sockets").checked = s.ckbSockets;
    if (SWAP_STONES.some(x => x.key === s.socketStone)) $("gear-socket-stone").value = s.socketStone;
    applySockets = s.applySockets === true;
  } catch (e) { /* 못 읽으면 처음 상태로 */ }
  return restored;
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
        const near = cand.filter(r => r.id === m.id && ATMA.elements.includes(r.el)).sort((a, b) => featureDistance(m.feature, a.f) - featureDistance(m.feature, b.f))[0];
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
  $("gear-socket-stone").innerHTML = SWAP_STONES.map(x => `<option value="${x.key}">${esc(x.name)}</option>`).join("");
  $("gear-now-weapon-weapon").value = DEFAULT_WEAPON;
  const restored = loadGear();
  // 방어구 칸이 처음 생겼을 때는 하의·신발 강화를 버프 세팅 값으로 시작한다
  for (const [part, id] of ENH_SLOTS) if (!restored.has(`gear-now-eq-${part}-enh`) && $(id).value !== "") eqSel("now", `${part}-enh`).value = $(id).value;
  const tables = $("gear-tables");
  tables.addEventListener("change", e => {
    const t = e.target;
    if (t.classList) t.classList.remove("filled", "check");
    if (t.id && t.id.startsWith("gear-now-") && lastShot[t.id]) {   // 사용자가 고친 칸의 아이콘을 기억 (5셋은 다섯 칸 모두)
      for (const { g, s, f } of lastShot[t.id]) if (f) learn(g, s, t.value, f);
    }
    saveGear();
  });
  // 결과 칸의 체크박스는 "input"에서 받는다: 화면 전체가 input 때 다시 그려져서, change 때는 이미 지워진 칸이라 여기까지 오지 않는다
  $("gear-out").addEventListener("input", e => {
    if (e.target.id === "gear-apply-sockets") { applySockets = e.target.checked; saveGear(); onChange(); return; }
    if (!e.target.closest("#gear-avatar-sets")) return;
    const boxes = [...document.querySelectorAll("#gear-avatar-sets input")];
    let on = boxes.filter(b => b.checked).map(b => b.value);
    if (on.length > AVATAR_SET_LIMIT) { e.target.checked = false; on = on.filter(n => n !== e.target.value); }
    nowAvatarSets = on.length ? on : null;
    saveGear(); onChange();
  });
  $("gear-optimize").addEventListener("click", async () => {
    const st = $("gear-opt-status"), btn = $("gear-optimize");
    st.hidden = false;
    if (!lastCtx || !hasWindow(lastCtx.win)) { st.textContent = "먼저 스펙 계산에 스탯창 값을 넣어 주세요. 그 값으로 DPS를 계산해서 찾아요."; return; }
    btn.disabled = true;
    const ctx = lastCtx, now = readGear("now"), locked = readLocks(), target = cdrTarget(ctx.win);
    const towns = townsToTry(ctx, locked), results = [];
    const t = performance.now();
    try {
      // 마을 버프마다 나눠 돌리고, 사이사이 화면에 진행 상황을 그린다
      for (let i = 0; i < towns.length; i++) {
        st.textContent = towns.length > 1 ? `찾는 중이에요… (마을 버프 ${i + 1}/${towns.length}: ${towns[i] || ctx.town})` : "찾는 중이에요…";
        await new Promise(r => setTimeout(r, 30));
        const r = optimizeGear(ctx, now, { locked, cdrTarget: target, towns: [towns[i]], equip: readGear("next").equip });   // 방어구는 바꿔 보기 것으로
        results.push(r.byTown[0]);
        results[results.length - 1].plans = r.plans;
      }
      const byTown = sortByTown(results), best = byTown[0];
      const sec = Math.max(0.1, (performance.now() - t) / 1000).toFixed(1);
      const plans = results.reduce((a, x) => a + x.plans, 0);
      fillNext(best.gear);
      // 스탯창에는 지금 낀 장비 효과가 이미 들어 있어서, 지금 세팅이 비어 있으면 변화가 실제보다 크게 나온다
      const worn = Object.values(now.avatar).concat(Object.values(now.normal)).filter(Boolean).length;
      const cdrText = x => target != null ? ` 초월 쿨감 ${trimPct(ctx.win.cdr_cho)} → ${trimPct(x.cdr)} (목표 ${trimPct(target)}${x.cdrMet ? "" : ", 목표를 맞출 수 있는 조합이 없어서 가장 가깝게 맞췄어요"}).` : "";
      // 점수 = DPS 변화 - 상한 초과 몫. 지금 세팅의 점수보다 높으면 바꾼 것이다 (DPS를 조금 손해 보고 초과를 줄인 경우도 있다)
      const better = best.score > -OVER_PENALTY * best.overNow + 1e-9;
      const overText = Math.abs(best.over - best.overNow) > 5e-5 ? ` 상한 초과 합 ${trimPct(best.overNow)}p → ${trimPct(best.over)}p.` : "";
      const eqChanged = JSON.stringify(best.gear.equip) !== JSON.stringify(now.equip);   // 방어구를 바꿔 봤으면 그 방어구 기준의 답 (지금보다 낮을 수도 있다)
      const head = eqChanged
        ? `"바꿔 보기"의 방어구를 낀 채로 가장 좋은 악세 조합을 채웠어요${towns.length > 1 ? ` (마을 버프: ${best.town})` : ""}. 지금보다 DPS ${signed(best.gain)}.${overText} 세트 조합 ${plans.toLocaleString("ko-KR")}가지를 따져 봤어요 (${sec}초).`
        : better
        ? `가장 좋은 조합을 "바꿔 보기"에 채웠어요${towns.length > 1 ? ` (마을 버프: ${best.town})` : ""}. 지금보다 DPS ${signed(best.gain)}${best.gain < -1e-9 ? " (상한 초과를 줄이느라 조금 낮아졌어요)" : ""}.${overText} 세트 조합 ${plans.toLocaleString("ko-KR")}가지를 따져 봤어요 (${sec}초).`
        : "지금 세팅이 이미 가장 좋아요.";
      let html = `<span>${esc(head + cdrText(best) + (worn < 12 ? " 지금 세팅 칸이 많이 비어 있어서 변화가 실제보다 크게 나올 수 있어요. 지금 낀 것을 먼저 채워 주세요." : ""))}</span>`;
      if (byTown.length > 1) {
        html += `<div class="town-pick"><span>마을 버프별 최고 조합 (누르면 그 조합으로 바꿔요)</span>` +
          byTown.map((x, i) => `<button type="button" data-i="${i}"${i === 0 ? ' class="on"' : ""}>${esc(x.town)}${x.town === ctx.town ? " (지금)" : ""} ${signed(x.gain)}${target != null && !x.cdrMet ? " · 쿨감 부족" : ""}</button>`).join("") + `</div>`;
      }
      st.innerHTML = html;
      lastTownResults = byTown;
      saveGear(); onChange();
    } catch (e) {
      st.textContent = "찾다가 문제가 생겼어요. 새로고침한 뒤 다시 해 주세요.";
    } finally { btn.disabled = false; }
  });
  $("gear-opt-status").addEventListener("click", e => {
    const b = e.target.closest("button[data-i]");
    if (!b || !lastTownResults) return;
    fillNext(lastTownResults[+b.dataset.i].gear);
    for (const x of $("gear-opt-status").querySelectorAll("button[data-i]")) x.classList.toggle("on", x === b);
    saveGear(); onChange();
  });
  $("gear-cdr-target").addEventListener("input", saveGear);
  $("gear-ckb-sockets").addEventListener("change", () => { saveGear(); onChange(); });
  $("gear-socket-stone").addEventListener("change", () => { saveGear(); onChange(); });
  $("gear-reset-next").addEventListener("click", () => {
    for (const e of allSelects()) if (e.id.startsWith("gear-next-") && [...e.options].some(o => o.value === SAME)) e.value = SAME;
    saveGear(); onChange();
  });
  $("gear-clear").addEventListener("click", () => {
    for (const e of allSelects()) if (e.id.startsWith("gear-now-") && !/-eq-.+-(enh|ref|s\d)$/.test(e.id)) { e.value = e.id.includes("-grade-") ? "유니크" : e.id.endsWith("-element") ? "유수" : e.id.endsWith("-weapon") ? DEFAULT_WEAPON : ""; e.classList.remove("filled", "check"); }
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
