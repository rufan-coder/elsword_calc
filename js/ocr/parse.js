// 글자 인식 결과(단어와 위치)를 스탯 값으로 바꾼다. 브라우저 없이도 돌아가는 순수 함수만 둔다.
//
// 원칙: 틀린 값을 넣느니 비워 둔다.
//   - 숫자는 형식이 정확히 맞을 때만 받는다 (공격력은 정수, 나머지는 "83.00%" 꼴)
//   - 라벨은 숫자 바로 왼쪽의 한 덩어리만 본다 (옆 칸 라벨이 섞이지 않게)
//   - 같은 칸에 서로 다른 값이 비슷한 확신으로 잡히면 버린다

import { STAT_LABELS } from "./labels.js";

const normLabel = text => String(text).replace(/[^0-9A-Za-z가-힣]/g, "");

/** pat과, text의 어느 한 구간 사이의 최소 편집 거리 (앞뒤에 붙은 잡글자는 무시된다) */
export function fuzzyFind(pat, text) {
  let prev = new Array(text.length + 1).fill(0);
  for (let i = 1; i <= pat.length; i++) {
    const cur = [i];
    for (let j = 1; j <= text.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (pat[i - 1] === text[j - 1] ? 0 : 1));
    prev = cur;
  }
  return Math.min(...prev);
}

/** 인식된 글자가 어느 스탯 이름인지 고른다. 70% 이상 닮은 것 중 가장 닮은 것, 비슷하면 더 긴 이름. 없으면 null */
export function matchLabel(raw) {
  const text = normLabel(raw);
  if (text.length < 2) return null;
  let best = null;
  for (const [pat, field] of STAT_LABELS) {
    if (text.length > pat.length + 4) continue;   // 옆 칸 라벨이 섞인 긴 글자는 받지 않음
    const score = 1 - fuzzyFind(pat, text) / pat.length;
    if (score < 0.7) continue;
    if (!best || score > best.score + 0.02 || (Math.abs(score - best.score) <= 0.02 && pat.length > best.pat.length)) best = { pat, field, score };
  }
  return best;
}

/**
 * numWords : 하늘색 수치만 읽은 단어들
 * labWords : 흰 글자(라벨)를 읽은 단어들
 * labLines : 흰 글자를 줄 단위로 읽은 문자열들 (공격력 범위 툴팁용)
 * 단어는 { text, conf, x0, y0, x1, y1 }
 * 반환: { found: { 칸: { value, score } }, range: { min, max, type } | null }
 */
export function parseShot(numWords, labWords, labLines) {
  const nums = numWords.filter(w => /\d/.test(w.text)).map(w => Object.assign({}, w, { yc: (w.y0 + w.y1) / 2, h: w.y1 - w.y0 }));
  const candidates = {};
  for (const n of nums) {
    const atkText = /^\d{3,8}$/.test(n.text), pctText = /^\d{1,3}\.\d{2}%$/.test(n.text);
    if (n.conf < 60 || !(atkText || pctText)) continue;
    // 같은 줄에서 이 숫자보다 왼쪽에 있는 다른 숫자의 오른쪽 끝 = 이 칸이 시작되는 곳
    const left = Math.max(0, ...nums.filter(m => m !== n && Math.abs(m.yc - n.yc) < n.h * 0.6 && m.x1 <= n.x0).map(m => m.x1));
    const row = labWords.filter(w => Math.abs((w.y0 + w.y1) / 2 - n.yc) < n.h * 0.7 && w.x0 >= left - 2 && w.x1 <= n.x0 + 2).sort((a, b) => b.x0 - a.x0);
    // 숫자에 가까운 단어부터 왼쪽으로 가다가, 단어 사이가 크게 벌어지면 멈춘다 (왼쪽 칸 숫자를 놓쳤을 때 그 칸 라벨이 딸려오는 것 방지)
    const label = [];
    for (const w of row) { if (label.length && label[label.length - 1].x0 - w.x1 > n.h * 2.2) break; label.push(w); }
    const m = matchLabel(label.reverse().map(w => w.text).join(""));
    if (!m || !m.field) continue;
    const isAtk = m.field === "patk" || m.field === "matk";
    if (isAtk !== atkText) continue;
    const value = isAtk ? parseInt(n.text, 10) : parseFloat(n.text);
    if ((m.field === "crit" || m.field === "maxi") && value > 100) continue;
    (candidates[m.field] = candidates[m.field] || []).push({ value, score: m.score });
  }
  const found = {};
  for (const field of Object.keys(candidates)) {
    const list = candidates[field].sort((a, b) => b.score - a.score);
    if (list.length > 1 && list[1].value !== list[0].value && list[0].score - list[1].score < 0.15) continue;
    found[field] = list[0];
  }

  // "[마법 공격력 범위]" 다음 줄의 "137848~169166"
  let range = null;
  for (let i = 0; i < labLines.length && !range; i++) {
    const t = labLines[i].replace(/\s/g, ""), mm = t.match(/(\d{4,8})[~\-–—_=]+(\d{4,8})/);
    if (!mm || +mm[2] <= +mm[1]) continue;
    const around = (labLines[i - 1] || "") + t;
    range = { min: +mm[1], max: +mm[2], type: /마법/.test(around) ? "마법" : /물리/.test(around) ? "물리" : null };
  }
  return { found, range };
}
