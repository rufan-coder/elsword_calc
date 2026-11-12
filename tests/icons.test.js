import { test } from "node:test";
import assert from "node:assert/strict";
import { iconFeature, matchIcon, matchCell, encodeFeature, decodeFeature, isEmptySlot, FEATURE_LENGTH } from "../js/ocr/icons.js";
import { findCharWindow, equipCells } from "../js/ocr/equip-window.js";
import { ICONS } from "../js/data/icons.js";
import { ACCESSORIES, NEW_ACCESSORIES, ARMOR_AVATARS, WEAPON_AVATARS, OUTFITS } from "../js/data/accessories.js";

/** 가짜 이미지: w x h RGBA, paint(x, y) -> [r, g, b] */
function image(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = paint(x, y), p = (y * w + x) * 4; data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255; }
  return { data, width: w };
}
// 줄무늬 배경 위에 그린 아이콘 (배경색만 바꿀 수 있게)
const icon = (bg, shape) => image(36, 36, (x, y) => {
  if (shape(x, y)) return shape(x, y);
  const stripe = Math.floor(Math.atan2(y - 18, x - 18) * 4) % 2 === 0;
  return stripe ? bg[0] : bg[1];
});
const PINK = [[255, 60, 190], [235, 40, 160]], GREEN = [[80, 200, 90], [60, 170, 70]];
const ring = (x, y) => { const d = Math.hypot(x - 14, y - 18); return d < 9 && d > 5 ? [30, 30, 40] : d <= 5 ? [240, 240, 250] : null; };
const bar = (x, y) => (x > 8 && x < 20 && y > 4 && y < 32 ? [200, 160, 40] : null);
const box = { x: 1, y: 1, w: 34, h: 34 };
const feat = im => iconFeature(im.data, im.width, box);

test("아이콘: 배경색이 달라도 같은 그림이면 가깝고, 다른 그림이면 멀다", () => {
  const refs = [{ id: "고리", f: feat(icon(PINK, ring)) }, { id: "막대", f: feat(icon(PINK, bar)) }];
  const m = matchIcon(feat(icon(GREEN, ring)), refs);
  assert.equal(m.id, "고리");
  assert.ok(m.sure, `거리 ${m.distance}, 거리비 ${m.ratio}`);
  assert.equal(matchIcon(feat(icon(GREEN, bar)), refs).id, "막대");
});

test("아이콘: 칸 위치가 2픽셀 어긋나도 맞춘다", () => {
  const refs = [{ id: "고리", f: feat(icon(PINK, ring)) }, { id: "막대", f: feat(icon(PINK, bar)) }];
  const im = icon(PINK, ring), shifted = image(40, 40, (x, y) => {   // 그림을 오른쪽 아래로 2픽셀 옮긴 큰 이미지
    const sx = x - 2, sy = y - 2;
    if (sx < 0 || sy < 0 || sx >= 36 || sy >= 36) return [40, 40, 48];
    const p = (sy * 36 + sx) * 4; return [im.data[p], im.data[p + 1], im.data[p + 2]];
  });
  assert.equal(matchCell(shifted.data, shifted.width, box, refs).id, "고리");
});

test("아이콘: 빈 칸을 알아본다", () => {
  const empty = image(36, 36, (x, y) => (Math.hypot(x - 18, y - 18) < 8 ? [70, 72, 78] : [42, 44, 50]));
  assert.ok(isEmptySlot(empty.data, empty.width, box));
  assert.ok(!isEmptySlot(icon(PINK, ring).data, 36, box));
});

test("아이콘: 특징값을 글자로 바꿨다 되돌려도 같다", () => {
  const f = feat(icon(PINK, ring));
  assert.equal(f.length, FEATURE_LENGTH);
  assert.deepEqual(decodeFeature(encodeFeature(f)), f);
});

test("아이콘 기준표: 모든 줄이 데이터의 아이템을 가리킨다", () => {
  const acc = new Set([...ACCESSORIES, ...NEW_ACCESSORIES].map(a => `${a.layer}|${a.slot}|${a.name}`));
  for (const [group, slot, id, f] of ICONS) {
    assert.equal(decodeFeature(f).length, FEATURE_LENGTH);
    if (group === "avatar" || group === "normal") assert.ok(acc.has(`${group}|${slot}|${id}`), id);
    else if (group === "armor") assert.ok(ARMOR_AVATARS[id], id);
    else if (group === "wavatar") assert.ok(WEAPON_AVATARS.some(w => w.name === id), id);
    else if (group === "outfit") assert.ok(OUTFITS.some(o => o.name === id), id);
    else assert.fail(group);
  }
});

/** 캐릭터 창 흉내: 제목 표시줄과 장비 리포트 버튼만 그린다 (버튼 왼쪽 위 = (bx, by), 배율 s) */
function fakeWindow(bx, by, s) {
  return image(Math.round(1300 * s), Math.round(1000 * s), (x, y) => {
    const rx = (x - bx) / s, ry = (y - by) / s;
    if (rx >= 0 && rx < 160 && ry >= 0 && ry < 31) return [0, 165, 234];                   // 버튼
    if (rx >= -379 && rx < 165 && ry >= -549 && ry < -520) return [3, 133, 188];           // 제목 표시줄
    if (rx >= 600 && rx < 770 && ry >= 0 && ry < 44) return [6, 151, 228];                 // 다른 하늘색 버튼 (위에 제목 표시줄 없음)
    return [40, 40, 46];
  });
}

test("캐릭터 창: 장비 리포트 버튼과 제목 표시줄로 위치와 배율을 찾는다", () => {
  for (const s of [1, 1.5, 0.75]) {
    const bx = Math.round(500 * s), by = Math.round(700 * s), im = fakeWindow(bx, by, s);
    const win = findCharWindow(im.data, im.width, im.data.length / 4 / im.width);
    assert.ok(win, `배율 ${s}`);
    assert.ok(Math.abs(win.x - bx) <= 1 && Math.abs(win.y - by) <= 1 && Math.abs(win.scale - s) < 0.02, JSON.stringify(win));
  }
});

test("캐릭터 창: 칸은 아바타 악세 11, 일반 악세 12, 한 벌 1, 레어 아바타 5, 무기 아바타 1", () => {
  const cells = equipCells({ x: 500, y: 700, scale: 1 }), count = g => cells.filter(c => c.group === g).length;
  assert.deepEqual([count("avatar"), count("normal"), count("outfit"), count("armor"), count("wavatar")], [11, 12, 1, 5, 1]);
});
