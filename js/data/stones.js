// 소켓(마법석) 관련 수치.

/**
 * 마법석 종류와 방어구 한 칸 기준 기본 수치(%). 화면의 "한 칸 수치" 기본값으로 쓴다.
 * atma: 아트마 마법석인지. "아트마 마법석 사용 X"로 두면 이 종류는 새로 끼우는 후보에서 빠진다.
 */
export const STONES = [
  { key: "crit", name: "크리티컬", percent: 6 },
  { key: "maxi", name: "극대화", percent: 6 },
  { key: "boss", name: "힘트마 보뎀", percent: 3, atma: true },
  { key: "boss2", name: "사냥석 보뎀", percent: 2.5 },
  { key: "all", name: "모스뎀", percent: 2, atma: true },
  { key: "cho", name: "초스뎀", percent: 2.5, atma: true },
  { key: "gang", name: "강렬스뎀", percent: 2.5, atma: true },
  { key: "both", name: "유강강초", percent: 2, atma: true },   // 강렬·초월 스뎀이 각각 이만큼 오른다
];

/** 네블론 방어구가 없을 때의 전체 소켓 칸 수 (무기 소켓은 한 칸을 2칸으로 센다). 네블론 1개당 1칸 늘어난다. */
export const SLOT_BASE = 38;

/** 크리·극대 마법석 한 칸 수치. 크극 최적화에서 보뎀 한 칸과 맞바꾸는 기준 */
export const CRIT_MAXI_PER_SLOT = 0.06;
