// 입력칸 목록, 처음 열었을 때의 예시 값, 브라우저에 저장·불러오기.

import { $ } from "./dom.js";
import { readOptionRows, setOptionRows } from "./compare-view.js";
import { CLASS } from "../data/classes.js";
import { DUNGEONS } from "../data/dungeons.js";
import { STONES, SLOT_BASE } from "../data/stones.js";

/** 스탯창 값 입력칸 (id) */
export const STAT_IDS = ["crit", "crit_dmg", "maxi", "A", "A_max", "W", "boss", "all_skill", "cho", "gang", "share_cho", "polar", "add", "hp_over", "hp_under", "hp100"];
/** 버프 세팅 입력칸 */
const SETUP_IDS = ["town", "yellow", "pants", "shoes", "eng_kind_1", "eng_val_1", "eng_kind_2", "eng_val_2", "eng_kind_3", "eng_val_3", "enc_cdr", "enc_dur"];
/** 크극·소켓 최적화 탭의 입력칸 */
const TOOL_IDS = ["ckb_boss", "ckb_min", "sk_neb", "sk_slots", "sk_boss_target",
  ...STONES.map(s => "sk_per_" + s.key), "sk_cnt_empty", ...STONES.map(s => "sk_cnt_" + s.key)];
const ALL_IDS = STAT_IDS.concat(SETUP_IDS, TOOL_IDS);

/** 처음 열었을 때 채워 두는 예시 (트윈즈 피카로). 입력칸에 보이는 그대로의 단위다 */
export const DEFAULTS = {
  cls: "트윈즈 피카로", field: "네블론 레이드",
  crit: 83, crit_dmg: 199.4, maxi: 65.12, A: 124266, A_max: 169166, W: 44020, boss: 190, all_skill: 127.5, cho: 130.1, gang: 100.1,
  share_cho: 95, polar: 59.2, add: 91.5, hp_over: 34, hp_under: 34, hp100: 41.5,
  town: "온천 버프", yellow: "1", pants: 11, shoes: 11,
  eng_kind_1: "matk", eng_val_1: 5, eng_kind_2: "cd", eng_val_2: 5, eng_kind_3: "skill", eng_val_3: 5, enc_cdr: 30, enc_dur: 0,
  ckb_boss: "2.5", ckb_min: 25, sk_neb: "0", sk_slots: SLOT_BASE, sk_boss_target: "boss",
  ...Object.fromEntries(STONES.map(s => ["sk_per_" + s.key, s.percent])),
  sk_cnt_crit: 12, sk_cnt_maxi: 8, sk_cnt_boss: 4, sk_cnt_boss2: 4, sk_cnt_cho: 10,
  opts: [["힘트마", "boss", 6, ""], ["지트마", "cho", 5, ""], ["사냥석", "boss", 5, ""], ["기민석", "both", 4, ""], ["크리 마법석", "crit", 6, ""], ["극대 마법석", "maxi", 6, ""]],
};

const KEY = "elsword-spec-calc-v2";
const VERSION = 2;   // 저장 형식이 바뀔 때 올린다 (readSaved의 보정 참고)

/** state를 화면 입력칸에 채운다 */
export function loadState(state) {
  $("cls").value = state.cls; $("field").value = state.field;
  for (const id of ALL_IDS) $(id).value = state[id] == null ? "" : state[id];
  setOptionRows(state.opts);
}

/** 지금 화면 입력값 전체 */
export function snapshot() {
  const s = { v: VERSION, cls: $("cls").value, field: $("field").value, opts: readOptionRows() };
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
    return Object.assign({}, DEFAULTS, saved);
  } catch (e) { return null; }
}

export function saveTab(tab) {
  try { localStorage.setItem(KEY + "-tab", tab); } catch (e) { /* 위와 같음 */ }
}
export function readTab() {
  try { return localStorage.getItem(KEY + "-tab"); } catch (e) { return null; }
}
