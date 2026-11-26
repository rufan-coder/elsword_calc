// 화면 입력칸 -> 계산에 넣을 값.

import { $, num, pct, pctOrZero } from "./dom.js";
import { STAT_IDS } from "./state.js";
import { CLASS, withClassSkill } from "../data/classes.js";
import { DUNGEONS } from "../data/dungeons.js";
import { MAX_ENHANCE, BUFF_ITEMS } from "../data/buffs.js";
import { hasAtkPct, statAtkPct } from "../calc/stats.js";
import { buildSetup } from "../calc/buffs.js";

/** 동속 패시브·버프를 켜고 끈 것 (숨은 칸 aspd_skills 의 JSON). 못 읽으면 빈 값 */
function readAspdSkills() {
  try { const o = JSON.parse($("aspd_skills").value || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; }
}

/** 고르는 칸(전직, 던전, 강화 수치)의 선택지를 데이터에서 채운다 */
export function initInputs() {
  for (const name of Object.keys(CLASS)) $("cls").add(new Option(name, name));
  for (const name of Object.keys(DUNGEONS)) $("field").add(new Option(name, name));
  for (const id of ["pants", "shoes"]) for (let n = 0; n <= MAX_ENHANCE; n++) $(id).add(new Option(n + "강", n));
  // 실전 수치의 동작 속도 칸 오른쪽 위 파티/솔로 버튼 -> 숨은 aspd_party 값을 바꾸고 다시 계산 (타일은 다시 그려지니 포커스를 새 버튼으로 옮긴다)
  $("tiles").addEventListener("click", e => {
    const b = e.target.closest("[data-aspd-party]"), sel = $("aspd_party");
    if (!b || sel.value === b.dataset.aspdParty) return;
    sel.value = b.dataset.aspdParty;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    const again = $("tiles").querySelector(`[data-aspd-party="${b.dataset.aspdParty}"]`);
    if (again) again.focus();
  });
  // 동작 속도 칸의 전직 패시브·버프 버튼 -> 켜고 끈 것을 숨은 aspd_skills 에 적고 다시 계산
  $("tiles").addEventListener("click", e => {
    const b = e.target.closest("[data-aspd-skill]");
    if (!b) return;
    const o = readAspdSkills(), key = b.dataset.aspdSkill;
    o[key] = b.getAttribute("aria-pressed") !== "true";
    $("aspd_skills").value = JSON.stringify(o);
    $("aspd_skills").dispatchEvent(new Event("change", { bubbles: true }));
    const again = [...$("tiles").querySelectorAll("[data-aspd-skill]")].find(x => x.dataset.aspdSkill === key);
    if (again) again.focus();
  });
  for (const [id, slot] of [["acc_face_top", "face_top"], ["acc_ear", "ear"]]) {
    $(id).add(new Option("해당사항 없음", ""));
    for (const name of Object.keys(BUFF_ITEMS[slot])) $(id).add(new Option(name, name));
  }
}

/**
 * 반환:
 *   cls, job   : 전직 이름과 패시브
 *   dungeon, resist : 던전 이름과 크리저항
 *   win        : 스탯창 값 (비율로 변환, 빈 칸은 빠짐)
 *   setup      : 버프 묶음, town : 고른 마을 버프 이름, buffs : 화면에 보여 줄 버프 중간 수치
 *   shareBlank : 초월 점유율을 비워 뒀는지
 */
export function readInputs() {
  const cls = $("cls").value, dungeon = $("field").value;
  const win = {};
  for (const id of STAT_IDS) {
    if (id === "A" || id === "A_max" || id === "W") { const v = num(id); if (v != null) win[id] = v; }   // 공격력은 % 가 아님
    else if (id === "share_cho") {
      const v = num(id), cho = v == null ? 85 : Math.min(100, Math.max(0, v));
      win.share_cho = cho; win.share_gang = 100 - cho;
    }
    else { const v = pct(id); if (v != null) win[id] = v; }
  }
  if (hasAtkPct(win)) win.atk_pct = statAtkPct(win.A, win.A_max, win.W);
  if (win.aspd >= 1) win.aspd -= 1;   // 동작 속도를 121.4처럼 100 기준으로 넣었으면 21.4%로 본다 (스탯창 상한이 30%라 헷갈릴 일이 없다)

  $("acc_battle").disabled = !(BUFF_ITEMS.ear[$("acc_ear").value] || {}).cd_mult_by_battle;   // 글리터의 훈장일 때만 쓴다
  const { setup, detail } = buildSetup({
    town: $("town").value,
    yellow: $("yellow").value === "1",
    pantsEnhance: num("pants") || 0, shoesEnhance: num("shoes") || 0,
    stoneCdr: pctOrZero("enc_cdr"), stoneDur: pctOrZero("enc_dur"),
    faceTop: $("acc_face_top").value, ear: $("acc_ear").value, battle: num("acc_battle") || 0,
    party: $("aspd_party").value === "1", atma: $("acc_atma").value,
    cls, aspdSkills: readAspdSkills(),
  });
  setup.debuff = DUNGEONS[dungeon].debuff;   // 적응력 계산에 쓴다
  return { cls, job: withClassSkill(cls, $("cls_skill").value), dungeon, resist: DUNGEONS[dungeon].critResist, win, setup, town: $("town").value, buffs: detail, shareBlank: $("share_cho").value === "" };
}
