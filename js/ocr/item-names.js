// 장비 리포트 같은 화면에서 읽은 아이템 이름을 시트(데이터)의 이름에 맞춘다. 브라우저 없이 돌아가는 순수 함수만 둔다.
//
// 게임의 이름에는 시트에 없는 말이 앞에 붙는다
//   - 대괄호 꼬리표: [루리엘], [아리엘], [코보] 등
//   - 캐릭터 이름: "라비 베스마풍 공존의 축제 의상" -> "베스마풍 공존의 축제 의상"
//                  "그란디플로라 : 만개한 브로치 (라비)" -> "그란디플로라 : 만개한 브로치"
// 이 둘을 떼고, 남은 이름을 데이터의 이름과 글자 단위로 비교한다.

import { fuzzyFind } from "./parse.js";

/** 아이템 이름 앞에 붙는 캐릭터 이름 */
export const CHARACTER_NAMES = ["엘소드", "아이샤", "레나", "레이븐", "이브", "청", "아라", "엘리시스", "애드", "루", "시엘", "로제", "아인", "라비", "노아", "리티아"];

const compact = s => String(s).replace(/[^0-9A-Za-z가-힣]/g, "");

/** 화면에 보이는 이름 -> 시트식 이름 (꼬리표와 캐릭터 이름을 뗀다) */
export function normalizeItemName(raw) {
  let s = String(raw).trim();
  for (;;) {   // 꼬리표는 여러 개일 수 있고, 글자 인식에서 닫는 괄호가 "|"로 읽히기도 한다
    const t = s.replace(/^[\[(][^\]\)|]{1,8}[\])|]\s*/, "");
    if (t === s) break;
    s = t;
  }
  for (const c of CHARACTER_NAMES) if (s.startsWith(c + " ")) { s = s.slice(c.length + 1); break; }
  // 장비 리포트에서는 캐릭터 이름이 뒤에 괄호로 붙는다: "그란디플로라 : 만개한 브로치 (라비)"
  s = s.replace(new RegExp(`\\s*\\((${CHARACTER_NAMES.join("|")})\\)\\s*$`), "");
  return s.replace(/\s+/g, " ").trim();
}

/** 글자 인식 결과 한 줄에서 끝의 장착 비율("26.7%")과 앞뒤 잡글자를 걷어 낸 글자 (공백·기호 없음) */
function cleanLine(raw) {
  let t = compact(normalizeItemName(String(raw).replace(/\s*\d{1,3}(\.\d{1,2})?\s*%?\s*$/, "")));
  for (const c of CHARACTER_NAMES) {   // 띄어쓰기를 못 읽어 캐릭터 이름이 붙어 버린 경우
    const i = t.indexOf(c);
    if (i >= 0 && i <= 4 && t.length - i - c.length >= 4) { t = t.slice(i + c.length); break; }
  }
  return t;
}

/**
 * 읽은 한 줄이 어느 아이템인지 고른다.
 * names : 후보 이름 목록 (같은 아이템의 다른 이름은 [이름, 다른 이름...] 배열로)
 * 반환: { name, score } 또는 null (닮은 게 없거나, 두 후보가 비슷하게 닮아 헷갈리면)
 */
export function matchItemName(raw, names) {
  const text = cleanLine(raw);
  if (text.length < 2) return null;
  // 글자가 그대로 같은 이름이 있으면 그것 ("침식된 엘리아노드 웨폰 가드"가 "엘리아노드 웨폰가드"를 품고 있어도)
  for (const entry of names) {
    const list = Array.isArray(entry) ? entry : [entry];
    if (list.some(n => compact(n) === text)) return { name: list[0], score: 1 };
  }
  const scored = [];
  for (const entry of names) {
    const list = Array.isArray(entry) ? entry : [entry];
    let best = 0;
    // 시트 이름 끝의 구분용 괄호("청옥 반지(마반)")는 게임 이름에 없어서, 뗀 이름으로도 비교한다
    for (const n of list.flatMap(x => [x, x.replace(/\s*\([^)]*\)\s*$/, "")])) {
      const pat = compact(n);
      if (!pat || text.length > pat.length + 6) continue;
      best = Math.max(best, 1 - fuzzyFind(pat, text) / pat.length);
    }
    scored.push({ name: list[0], score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  const [first, second] = scored;
  if (!first || first.score < 0.75) return null;
  // 비슷한 이름이 둘이면 버린다. 다만 글자가 완전히 같으면 한 글자 차이 나는 후보가 있어도 받는다 ("영성의 반지"와 "영락의 반지")
  if (second && first.score - second.score < 0.1 && !(first.score > 0.999 && second.score < first.score)) return null;
  return first;
}
