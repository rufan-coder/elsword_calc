import { test } from "node:test";
import assert from "node:assert/strict";
import { matchLabel, parseShot } from "../js/ocr/parse.js";
import { findPanel, maskPixels } from "../js/ocr/image.js";

// 화면 위의 단어 하나. 글자 하나를 폭 20, 줄 높이를 26으로 본다
const word = (text, x0, y, conf = 90) => ({ text, conf, x0, y0: y, x1: x0 + text.length * 20, y1: y + 26 });
// 띄어쓰기로 나뉜 라벨 한 덩어리. 단어 사이는 실제 화면처럼 좁게(10) 둔다
function label(text, x0, y) {
  const out = [];
  for (const t of text.split(" ")) { out.push(word(t, x0, y)); x0 += t.length * 20 + 10; }
  return out;
}

test("라벨 맞추기: 앞에 붙은 잡글자와 약간의 오타는 견딘다", () => {
  assert.equal(matchLabel("뿔 극대화").field, "maxi");
  assert.equal(matchLabel("크리티컬 확를").field, "crit");
  assert.equal(matchLabel("체력 50% 초과인 적 공격시 데미지 증가").field, "hp_over");
  assert.equal(matchLabel("체력 50% 이하인 적 공격시 데미지 증가").field, "hp_under");
});

test("라벨 맞추기: 비슷한 이름을 서로 헷갈리지 않는다", () => {
  assert.equal(matchLabel("하이퍼 스킬 데미지 증가").field, null);       // 모든 스킬 데미지가 아님
  assert.equal(matchLabel("강렬한 스킬 재사용 시간 감소").field, null);   // 강렬한 스킬 데미지가 아님
  assert.equal(matchLabel("보스에게 받는 피해 감소").field, null);
  assert.equal(matchLabel("적 마법 방어력 무시").field, null);            // 마법 공격력이 아님
  assert.equal(matchLabel("초적응력").pat, "초적응력");
  assert.equal(matchLabel("크리티컬 확률 크리티컬 데미지"), null);        // 두 칸이 붙은 글자는 버린다
});

test("숫자와 라벨 짝짓기: 두 칸짜리 줄", () => {
  const nums = [word("83.00%", 500, 100), word("199.40%", 1300, 100), word("49752", 520, 40), word("124266", 1320, 40)];
  const labs = [...label("크리티컬 확률", 60, 100), ...label("크리티컬 데미지", 760, 100), ...label("물리 공격력", 60, 40), ...label("마법 공격력", 760, 40)];
  const { found } = parseShot(nums, labs, []);
  assert.equal(found.crit.value, 83); assert.equal(found.crit_dmg.value, 199.4);
  assert.equal(found.patk.value, 49752); assert.equal(found.matk.value, 124266);
});

test("왼쪽 칸 숫자를 못 읽어도 오른쪽 숫자가 왼쪽 라벨을 가져가지 않는다", () => {
  const nums = [word("130.10%", 1300, 100)];     // 왼쪽 "강렬 100.10%"는 인식 실패
  const labs = [...label("강렬한 스킬 데미지 증가", 60, 100), ...label("초월한 스킬 데미지 증가", 760, 100)];
  const { found } = parseShot(nums, labs, []);
  assert.equal(found.cho.value, 130.1);
  assert.equal(found.gang, undefined);
});

test("형식이 어긋나거나 확신이 낮은 숫자는 버린다", () => {
  const labs = [...label("극대화", 60, 100), ...label("크리티컬 확률", 60, 160), ...label("모든 스킬 데미지 증가", 60, 220)];
  const nums = [word("6512%", 500, 100), word("199.40%", 500, 160), word("127.50%", 500, 220, 40)];
  const { found } = parseShot(nums, labs, []);
  assert.equal(found.maxi, undefined);        // 소수점이 빠짐
  assert.equal(found.crit, undefined);        // 크리티컬 확률은 100%를 넘을 수 없음
  assert.equal(found.all_skill, undefined);   // 확신 40
});

test("공격력 범위 툴팁에서 최댓값과 타입을 읽는다", () => {
  const { range } = parseShot([], [], ["던전 대전 [마법 공격력 범위]", "137848~169166"]);
  assert.deepEqual(range, { min: 137848, max: 169166, type: "마법" });
  assert.equal(parseShot([], [], ["크리티컬 확률"]).range, null);
});

// 가짜 화면: 어두운 배경 위에 스탯 창 색 사각형
function fakeScreen(w, h, panel) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const inside = panel && x >= panel.x0 && x <= panel.x1 && y >= panel.y0 && y <= panel.y1;
    data.set(inside ? [36, 42, 48, 255] : [45, 45, 45, 255], (y * w + x) * 4);
  }
  return data;
}

test("상세 스탯 창 찾기: 줄 배경색이 모인 사각형", () => {
  const panel = { x0: 300, y0: 80, x1: 700, y1: 380 };
  assert.deepEqual(findPanel(fakeScreen(800, 400, panel), 800, 400), panel);
  assert.equal(findPanel(fakeScreen(800, 400, null), 800, 400), null);     // 회색 창만 있으면 못 찾는다
});

test("색 거르기: 하늘색 수치와 흰 라벨을 따로 남긴다", () => {
  const px = (r, g, b) => new Uint8ClampedArray([r, g, b, 255]);
  const ink = (rgb, kind) => { const d = px(...rgb); maskPixels(d, kind); return 255 - d[0]; };     // 0 = 지워짐, 255 = 글자
  assert.equal(ink([0, 204, 255], "num"), 255);      // 수치 색
  assert.equal(ink([198, 216, 236], "num"), 0);      // 라벨 색은 수치에서 빠짐
  assert.equal(ink([36, 42, 48], "num"), 0);         // 배경
  assert.equal(ink([198, 216, 236], "lab"), 255);
  assert.equal(ink([0, 204, 255], "lab"), 0);        // 수치 색은 라벨에서 빠짐
});
