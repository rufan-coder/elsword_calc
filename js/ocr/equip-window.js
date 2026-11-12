// 스크린샷에서 게임의 "캐릭터" 창을 찾고, 장비 칸의 위치를 돌려준다. 브라우저 없이도 돌아가는 순수 함수만 둔다.
//
// 기준점은 창 오른쪽 아래의 하늘색 "모험가 장비 리포트" 버튼 왼쪽 위 모서리다. 1920x1080 화면에서 버튼 폭은 160픽셀이다.
// 비슷한 하늘색 버튼(던전 시작 등)과 헷갈리지 않게, 버튼 위쪽 같은 자리에 창의 파란 제목 표시줄이 있는지도 확인한다.
// 칸 위치는 모두 버튼 모서리에서 잰 거리이고, 화면 크기에 따라 창 크기가 달라지면 버튼 폭으로 배율을 구해 맞춘다.

const BUTTON_WIDTH = 160;

// 아래 좌표는 모두 1920x1080 기준, 버튼 왼쪽 위 모서리에서의 거리 (x, y, 칸 크기)
const ACC_X = { avatar: [1, 40], normal: [82, 121] };
const ACC_Y = [-252, -213, -174, -135, -96, -57];
const ACC_CELL = 38, ACC_PAD = 2;
/** 악세 칸 배치. 왼쪽 열·오른쪽 열 순서, null 은 칸이 없는 자리 */
const ACC_LAYOUT = {
  avatar: [["weapon", "face_top", "face_mid", "face_low", "ear", null], ["support", "top", "bottom", "arm", "neck", "ring"]],
  normal: [["weapon", "face_top", "face_mid", "face_low", "ear", "ring"], ["support", "top", "bottom", "arm", "neck", "ring2"]],
};
/** 왼쪽 큰 칸: 한 벌 아바타, 그 아래 레어 아바타 다섯 칸 */
const ARMOR_X = -433, ARMOR_Y0 = -328, ARMOR_PITCH = 50.8, ARMOR_CELL = 48, ARMOR_PAD = 3;
const ARMOR_LAYOUT = ["outfit", "hair", "top", "bottom", "gloves", "shoes"];
/** 오른쪽 위 큰 칸 두 개 중 왼쪽이 무기 아바타 */
const WEAPON_AVATAR = { x: 62, y: -327, cell: 47, pad: 3 };
/** 버튼 위쪽 제목 표시줄 안의 점들 (창을 제대로 찾았는지 확인용) */
const TITLE_BAR = [[-255, -540], [-100, -540], [100, -540]];

const isButton = (r, g, b) => r < 40 && g >= 140 && g <= 225 && b >= 205;
const isBar = (r, g, b) => r < 70 && b > 140 && g > 85 && g < 175 && b - g > 25;

/** 버튼 후보: 같은 자리에서 시작하는 같은 길이의 하늘색 가로줄이 몇 줄 이어지는 곳 (버튼 윗부분) */
function buttonCandidates(data, w, h) {
  const out = [];
  let prev = [];
  for (let y = 0; y < h; y++) {
    const runs = [];
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const p = (y * w + x) * 4, on = x < w && isButton(data[p], data[p + 1], data[p + 2]);
      if (on && start < 0) start = x;
      if (!on && start >= 0) { if (x - start >= 80) runs.push({ x: start, len: x - start, top: y, rows: 1 }); start = -1; }
    }
    for (const r of runs) {
      const above = prev.find(p => Math.abs(p.x - r.x) <= 2 && Math.abs(p.len - r.len) <= 3);
      if (above) { r.top = above.top; r.rows = above.rows + 1; if (r.rows === 3) out.push({ x: r.x, y: r.top, len: r.len }); }
    }
    prev = runs;
  }
  return out;
}

function pixelIs(data, w, h, x, y, test) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const p = (y * w + x) * 4;
  return test(data[p], data[p + 1], data[p + 2]);
}

/** 캐릭터 창의 기준점 { x, y, scale } (버튼 왼쪽 위 모서리) 또는 null */
export function findCharWindow(data, w, h) {
  for (const c of buttonCandidates(data, w, h)) {
    const scale = c.len / BUTTON_WIDTH;
    if (TITLE_BAR.every(([dx, dy]) => pixelIs(data, w, h, c.x + dx * scale, c.y + dy * scale, isBar))) return { x: c.x, y: c.y, scale };
  }
  return null;
}

/**
 * 장비 칸 목록. 각 칸은 { group, slot, box: { x, y, w, h } } (box 는 테두리를 뺀 아이콘 자리)
 *   group: "avatar"(아바타 악세) | "normal"(일반 악세) | "outfit" | "armor"(레어 아바타) | "wavatar"(무기 아바타)
 */
export function equipCells(win) {
  const s = win.scale, at = (dx, dy, cell, pad) => {
    const size = (cell - pad * 2) * s;
    return { x: win.x + (dx + pad) * s, y: win.y + (dy + pad) * s, w: size, h: size };
  };
  const cells = [];
  for (const group of ["avatar", "normal"]) {
    ACC_LAYOUT[group].forEach((col, c) => col.forEach((slot, r) => {
      if (slot) cells.push({ group, slot, box: at(ACC_X[group][c], ACC_Y[r], ACC_CELL, ACC_PAD) });
    }));
  }
  ARMOR_LAYOUT.forEach((slot, r) => cells.push({ group: r ? "armor" : "outfit", slot, box: at(ARMOR_X, ARMOR_Y0 + ARMOR_PITCH * r, ARMOR_CELL, ARMOR_PAD) }));
  cells.push({ group: "wavatar", slot: "weapon_avatar", box: at(WEAPON_AVATAR.x, WEAPON_AVATAR.y, WEAPON_AVATAR.cell, WEAPON_AVATAR.pad) });
  return cells;
}
