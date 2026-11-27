// 입력칸 목록, 처음 열었을 때의 예시 값, 브라우저에 저장·불러오기.

import { $ } from "./dom.js";
import { readOptionRows, setOptionRows } from "./compare-view.js";
import { CLASS, CLASS_SKILLS } from "../data/classes.js";
import { DUNGEONS } from "../data/dungeons.js";
import { STONES, SLOT_BASE } from "../data/stones.js";
import { TOWN_BUFFS } from "../data/buffs.js";

/** 스탯창 값 입력칸 (id) */
export const STAT_IDS = ["crit", "crit_dmg", "maxi", "A", "A_max", "W", "boss", "all_skill", "cho", "gang", "share_cho", "polar", "add", "hp_over", "hp_under", "hp100",
  "adapt", "super_adapt", "cdr_gang", "cdr_cho", "aspd"];
/** 버프 세팅 입력칸 */
const SETUP_IDS = ["town", "title", "yellow", "pants", "shoes", "enc_cdr", "enc_dur", "acc_face_top", "acc_ear", "acc_battle", "acc_atma", "aspd_party", "aspd_party_v", "aspd_skills"];
/** 크극·소켓 최적화 탭의 입력칸 */
const TOOL_IDS = ["ckb_boss", "ckb_min", "sk_neb", "sk_slots", "sk_boss_target", "sk_atma",
  ...STONES.map(s => "sk_per_" + s.key), "sk_cnt_empty", ...STONES.map(s => "sk_cnt_" + s.key)];
const ALL_IDS = STAT_IDS.concat(SETUP_IDS, TOOL_IDS);

/** 처음 열었을 때 채워 두는 예시 (트윈즈 피카로). 입력칸에 보이는 그대로의 단위다 */
export const DEFAULTS = {
  cls: "트윈즈 피카로", cls_skill: "", field: "네블론 레이드",
  crit: 83, crit_dmg: 199.4, maxi: 65.12, A: 124266, A_max: 169166, W: 44020, boss: 190, all_skill: 127.5, cho: 130.1, gang: 100.1,
  share_cho: 95, polar: 59.2, add: 91.5, hp_over: 34, hp_under: 34, hp100: 41.5,
  adapt: 59, super_adapt: 10, cdr_gang: 32, cdr_cho: 32, aspd: "",
  town: "온천 버프", title: "엘리아노드 수호자", yellow: "1", pants: 11, shoes: 11,
  enc_cdr: 30, enc_dur: 0, acc_face_top: "", acc_ear: "", acc_battle: "0", acc_atma: "", aspd_party: "1", aspd_party_v: 9, aspd_skills: "",
  ckb_boss: "2.5", ckb_min: 0, sk_neb: "0", sk_slots: SLOT_BASE, sk_boss_target: "boss", sk_atma: "1",   // 힘트마 기준이면 아트마 사용은 O로 고정
  ...Object.fromEntries(STONES.map(s => ["sk_per_" + s.key, s.percent])),
  sk_cnt_crit: 12, sk_cnt_maxi: 8, sk_cnt_boss: 4, sk_cnt_boss2: 4, sk_cnt_cho: 10,
  // 옵션 비교 기본 목록: 자주 쓰는 마법석 + 시트 Main '옵션 효율표'처럼 스탯마다 1%
  opts: [["힘트마", "boss", 6], ["지트마", "cho", 5], ["사냥석", "boss", 5], ["기민석", "both", 4], ["크리 마법석", "crit", 6], ["극대 마법석", "maxi", 6],
    ["보뎀 1%", "boss", 1], ["모스뎀 1%", "all_skill", 1], ["초스뎀 1%", "cho", 1], ["강렬스뎀 1%", "gang", 1], ["공격력 1%", "atk_pct", 1],
    ["크뎀 1%", "crit_dmg", 1], ["곱연 크뎀 1%", "cd_mult", 1], ["크리 1%", "crit", 1], ["극대 1%", "maxi", 1], ["추피 1%", "add", 1],
    ["양극화 1%", "polar", 1], ["HP 100% 이하 1%", "hp100", 1], ["HP 50% 초과 1%", "hp_over", 1], ["HP 50% 이하 1%", "hp_under", 1],
    ["적응력 1%", "adapt", 1], ["초적응력 1%", "super_adapt", 1]],
};
/** 예전 기본 옵션 목록 (그대로 저장돼 있으면 새 기본 목록으로 바꾼다) */
const OLD_DEFAULT_OPTS = [["힘트마", "boss", 6, ""], ["지트마", "cho", 5, ""], ["사냥석", "boss", 5, ""], ["기민석", "both", 4, ""], ["크리 마법석", "crit", 6, ""], ["극대 마법석", "maxi", 6, ""]];
const optsKey = rows => JSON.stringify(rows.map(r => [r[0], r[1], String(r[2]), String(r[3] == null ? "" : r[3])]));

/**
 * 고른 전직에 선택 스킬이 있으면 선택지를 채워서 보여 주고, 없으면 숨긴다.
 * value: 고를 값 (없거나 선택지에 없으면 지금 값, 그것도 없으면 기본값)
 */
export function fillClassSkill(value) {
  const info = CLASS_SKILLS[$("cls").value], sel = $("cls_skill"), keep = value != null ? value : sel.value;
  $("cls_skill-wrap").hidden = !info;
  sel.length = 0;
  if (!info) return;
  $("cls_skill-label").textContent = `선택 스킬 · ${info.skill}`;
  for (const name of Object.keys(info.options)) sel.add(new Option(name, name));
  sel.value = info.options[keep] ? keep : info.default;
}

const KEY = "elsword-spec-calc-v2";
const VERSION = 2;   // 저장 형식이 바뀔 때 올린다 (readSaved의 보정 참고)

/** state를 화면 입력칸에 채운다 */
export function loadState(state) {
  $("cls").value = state.cls; $("field").value = state.field;
  fillClassSkill(state.cls_skill || "");
  for (const id of ALL_IDS) $(id).value = state[id] == null ? "" : state[id];
  setOptionRows(state.opts);
}

/** 지금 화면 입력값 전체 */
export function snapshot() {
  const s = { v: VERSION, ckb0: 1, cls: $("cls").value, cls_skill: $("cls_skill").value, field: $("field").value, opts: readOptionRows() };   // ckb0: 크리 최소 수치 기본값을 0으로 바꾼 뒤 저장했다는 표시
  for (const id of ALL_IDS) s[id] = $(id).value;
  return s;
}

export function save(snap) {
  try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch (e) { /* 저장이 막힌 환경이면 그냥 넘어간다 */ }
}

/** 저장해 둔 입력값. 없거나 못 쓰는 값이면 null. 예전 형식은 지금 형식에 맞게 보정한다 */
export function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!(saved && CLASS[saved.cls] && DUNGEONS[saved.field] && Array.isArray(saved.opts))) return null;
    // 소켓 기본 칸 수가 36 -> 38로 바뀌기 전에 저장된 값
    if (saved.v !== VERSION && +saved.sk_slots === 36 + (+saved.sk_neb || 0)) saved.sk_slots = SLOT_BASE + (+saved.sk_neb || 0);
    if (!("W" in saved)) saved.W = "";                                  // 무기 공격력 칸이 없던 때
    if (saved.sk_neb == null) saved.sk_slots = DEFAULTS.sk_slots;       // 네블론 선택이 없던 때
    if (!("sk_cnt_boss2" in saved)) saved.sk_cnt_boss2 = "";            // 보뎀을 힘트마·사냥석으로 나누기 전
    if (!("sk_cnt_crit" in saved)) for (const s of STONES) saved["sk_cnt_" + s.key] = "";   // 칸 수 대신 수치 합을 받던 때
    if (!("adapt" in saved)) for (const id of ["adapt", "super_adapt", "cdr_gang", "cdr_cho"]) saved[id] = "";   // 적응력·쿨감 칸이 없던 때 (예시 값이 섞이지 않게 비움)
    if (saved.town != null && !TOWN_BUFFS[saved.town]) saved.town = DEFAULTS.town;   // 목록에서 빠진 버프 (공존의 축제 등)
    if (optsKey(saved.opts) === optsKey(OLD_DEFAULT_OPTS)) saved.opts = DEFAULTS.opts;
    if (!saved.ckb0 && String(saved.ckb_min) === "25") saved.ckb_min = DEFAULTS.ckb_min;   // 예전 기본값(25%) 그대로면 시트처럼 0으로 (한 번만)   // 옵션 비교 기본 목록을 늘리기 전 그대로면 새 목록으로
    return Object.assign({}, DEFAULTS, saved);
  } catch (e) { return null; }
}

export function saveTab(tab) {
  try { localStorage.setItem(KEY + "-tab", tab); } catch (e) { /* 위와 같음 */ }
}
export function readTab() {
  try { return localStorage.getItem(KEY + "-tab"); } catch (e) { return null; }
}
