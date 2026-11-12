import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeItemName, matchItemName } from "../js/ocr/item-names.js";
import { OUTFITS } from "../js/data/accessories.js";

test("아이템 이름: 꼬리표와 캐릭터 이름을 뗀다", () => {
  assert.equal(normalizeItemName("라비 베스마풍 공존의 축제 의상"), "베스마풍 공존의 축제 의상");
  assert.equal(normalizeItemName("[루리엘] 라비 엘리오스의 고귀한 결투사 예복"), "엘리오스의 고귀한 결투사 예복");
  assert.equal(normalizeItemName("[코보] [아리엘] 엘소드 화랑연가 : 인연의 매듭"), "화랑연가 : 인연의 매듭");
  assert.equal(normalizeItemName("루 그란디플로라 : 요정의 날개"), "그란디플로라 : 요정의 날개");
  assert.equal(normalizeItemName("그란디플로라 : 만개한 브로치 (라비)"), "그란디플로라 : 만개한 브로치");
  assert.equal(normalizeItemName("[루리엘] 투명 액세서리 (무기)"), "투명 액세서리 (무기)");   // 캐릭터 이름이 아닌 괄호는 둔다
  assert.equal(normalizeItemName("루리엘의 선물"), "루리엘의 선물");   // 이름 일부가 "루"로 시작해도 떼지 않는다
});

test("아이템 이름: 실제 장비 리포트를 글자 인식한 줄을 시트 이름에 맞춘다", () => {
  const names = OUTFITS.map(o => [o.name, ...(o.aka || [])]);
  const lines = {   // 장비 리포트(한 벌 아바타) 스크린샷의 인식 결과 그대로
    "100이 라비베스마풍공존의축제의상              26.7%": "베스마풍 공존의 축제 의상",
    "라비공존의축제엘리아노드의상              67%": "공존의 축제 엘리아노드 의상",
    "[루리엘| 라비엘리오스의고귀한결투사예복、ㅎ 4.99%": "엘리오스의 고귀한 결투사 예복",
    "라비천하일미덤플링메이드의상            20.9%": "천하일미 덤플링 서번트 의상",   // 게임에서는 "메이드", 시트에서는 "서번트"
    "라비동방미식덤플링메이드의상             17.4%": "동방미식 덤플링 서번트 의상",
  };
  for (const [line, want] of Object.entries(lines)) assert.equal(matchItemName(line, names)?.name, want, line);
  assert.equal(matchItemName("”디", names), null);
});
