// 장비 리포트 스크린샷으로 아이콘 기준표(js/data/icons.js)를 만든다. 개발할 때만 쓰는 도구다.
//
//   node tools/build-icons.mjs <스크린샷 폴더>
//
// 스크린샷 폴더에는 tools/icon-labels.json 의 file 이름대로 리포트 스크린샷(PNG)이 있어야 한다.
// 스크린샷은 저장소에 올리지 않는다. 저장소에는 아이콘을 줄인 특징값(숫자)만 들어간다.
// 라벨의 이름은 게임 화면에 보이는 그대로 적고, 시트 데이터의 이름으로 잇는 건 이 도구가 한다.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readPng } from "./png.mjs";
import { iconFeature, encodeFeature, KEEP_BACKGROUND } from "../js/ocr/icons.js";
import { matchItemName, normalizeItemName } from "../js/ocr/item-names.js";
import { ACCESSORIES, NEW_ACCESSORIES, ARMOR_AVATARS, WEAPON_AVATARS, OUTFITS, ATMA } from "../js/data/accessories.js";

const folder = process.argv[2];
if (!folder) { console.error("사용법: node tools/build-icons.mjs <스크린샷 폴더>"); process.exit(1); }
const labels = JSON.parse(readFileSync(new URL("./icon-labels.json", import.meta.url), "utf8"));
const ALL_ACC = [...ACCESSORIES, ...NEW_ACCESSORIES];
const ATMA_RE = /^(장엄한|찬란한|정제된) 연화세계 정령왕의 (제삼안|영락|팔찌|목 장식|만다라) - (\S+)의 (아트마|니르바나)$/;
const PIECE_RE = /^(.*) (헤어|가면|상의|하의|장갑|신발)$/;

/** 화면 이름 -> [데이터 이름, 아트마 속성] */
function resolveName(group, slot, display) {
  const name = normalizeItemName(display);
  if (group === "avatar" || group === "normal") {
    const a = name.match(ATMA_RE);
    if (a) {
      const [, word, piece, element, kind] = a, grade = ATMA.gradeWords[word];
      const id = piece === "만다라"
        ? `장엄한 연화세계 정령왕의 만다라 - OO의 ${kind}(${grade}, ${kind === "니르바나" ? "100강배" : "강배x"})`
        : `찬란한 연화세계 정령왕의 ${piece} - OO의 아트마`;
      if (!ALL_ACC.some(x => x.name === id)) throw new Error(`아트마 악세를 데이터에서 못 찾음: ${display} -> ${id}`);
      return [id, element];
    }
    const cands = ALL_ACC.filter(x => x.slot === slot && x.layer === group).map(x => x.name);
    const m = matchItemName(name, cands);
    if (!m) throw new Error(`데이터에서 못 찾음: [${group} ${slot}] ${display}`);
    return [m.name];
  }
  if (group === "armor") {
    const m = name.match(PIECE_RE), set = m && m[1];
    if (!set || !ARMOR_AVATARS[set]) throw new Error(`레어 아바타 세트를 못 찾음: ${display}`);
    return [set];   // 가면도 헤어 칸이라 세트 이름만 쓴다
  }
  if (group === "wavatar") {
    const set = name.replace(/\s+\S+$/, ""), w = WEAPON_AVATARS.find(x => x.set === set + " 무악");
    if (!w) throw new Error(`무기 아바타를 못 찾음: ${display}`);
    return [w.name];
  }
  if (group === "outfit") {
    const m = matchItemName(name, OUTFITS.map(o => o.name));
    if (!m) throw new Error(`한 벌 아바타를 못 찾음: ${display}`);
    return [m.name];
  }
  throw new Error(`모르는 묶음: ${group}`);
}

const rows = [];
for (const r of labels.reports) {
  const img = readPng(join(folder, r.file)), slot = r.slot === "ring2" ? "ring" : r.slot;
  r.names.forEach((display, i) => {
    if (display == null) return;   // 데이터에서 뺀 아이템의 줄
    const [id, element] = resolveName(r.group, slot, display);
    const box = { x: r.first[0], y: r.first[1] + labels.pitch * i, w: labels.icon, h: labels.icon };
    const f = encodeFeature(iconFeature(img.data, img.width, box, { keepBackground: KEEP_BACKGROUND.has(r.group) }));
    if (rows.some(x => x[0] === r.group && x[1] === slot && x[2] === id && x[3] === f)) return;   // 같은 그림이 두 번 (반지 두 칸 등)
    rows.push(element ? [r.group, slot, id, f, element] : [r.group, slot, id, f]);
  });
}

const out = `// 자동으로 만든 파일이다 (node tools/build-icons.mjs). 직접 고치지 말고 tools/icon-labels.json 을 고쳐 다시 만든다.
//
// 아이템 아이콘 기준표. 게임의 모험가 장비 리포트(${labels.character}) 스크린샷에서 아이콘을 잘라 특징값으로 바꾼 것이다 (js/ocr/icons.js).
// 한 줄: [묶음, 부위, 데이터 이름, 특징값(base64), 아트마 속성]
//   묶음 avatar(아바타 악세) | normal(일반 악세) | armor(레어 아바타, 이름 = 세트) | wavatar(무기 아바타) | outfit(한 벌 아바타)

export const ICON_CHARACTER = ${JSON.stringify(labels.character)};
export const ICONS = [
${rows.map(r => "  " + JSON.stringify(r)).join(",\n")},
];
`;
writeFileSync(new URL("../js/data/icons.js", import.meta.url), out);
console.log(`아이콘 ${rows.length}개 -> js/data/icons.js`);
