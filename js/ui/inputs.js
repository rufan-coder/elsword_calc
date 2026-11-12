// 화면 입력칸 -> 계산에 넣을 값.

import { $, num, pct, pctOrZero } from "./dom.js";
import { STAT_IDS } from "./state.js";
import { CLASS } from "../data/classes.js";
import { DUNGEONS } from "../data/dungeons.js";
import { MAX_ENHANCE } from "../data/buffs.js";
import { hasAtkPct, statAtkPct } from "../calc/stats.js";
import { buildSetup } from "../calc/buffs.js";

/** 고르는 칸(전직, 던전, 강화 수치)의 선택지를 데이터에서 채운다 */
export function initInputs() {
  for (const name of Object.keys(CLASS)) $("cls").add(new Option(name, name));
  for (const name of Object.keys(DUNGEONS)) $("field").add(new Option(name, name));
  for (const id of ["pants", "shoes"]) for (let n = 0; n <= MAX_ENHANCE; n++) $(id).add(new Option(n + "강", n));
}

/**
 * 반환:
 *   cls, job   : 전직 이름과 패시브
 *   dungeon, resist : 던전 이름과 크리저항
 *   win        : 스탯창 값 (비율로 변환, 빈 칸은 빠짐)
 *   setup      : 버프 묶음, buffs : 화면에 보여 줄 버프 중간 수치
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

  const { setup, detail } = buildSetup({
    town: $("town").value,
    yellow: $("yellow").value === "1",
    pantsEnhance: num("pants") || 0, shoesEnhance: num("shoes") || 0,
    stoneCdr: pctOrZero("enc_cdr"), stoneDur: pctOrZero("enc_dur"),
  });
  return { cls, job: CLASS[cls], dungeon, resist: DUNGEONS[dungeon].critResist, win, setup, buffs: detail, shareBlank: $("share_cho").value === "" };
}
