// "옵션 비교" 탭: 비교할 옵션 목록과 결과 표.

import { $, fmt, esc, josa } from "./dom.js";
import { OPTION_KINDS, compare } from "../calc/compare.js";
import { has, POLAR_CAP } from "../calc/stats.js";

let rowSeq = 0;

export function addOptionRow(name, kind, value, price) {
  const i = rowSeq++;
  const row = document.createElement("div");
  row.className = "opt"; row.dataset.row = "1";
  const kinds = Object.entries(OPTION_KINDS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  row.innerHTML =
    `<input type="text" class="o-name" id="opt-name-${i}" aria-label="옵션 이름" placeholder="이름">` +
    `<select class="o-kind" id="opt-kind-${i}" aria-label="오르는 스탯">${kinds}</select>` +
    `<input type="number" class="o-val" id="opt-val-${i}" aria-label="수치(%)" step="0.1" placeholder="수치 %">` +
    `<input type="number" class="o-price" id="opt-price-${i}" aria-label="가격" step="any" min="0" placeholder="가격">` +
    `<button type="button" class="ghost o-del" aria-label="이 옵션 지우기">✕</button>`;
  row.querySelector(".o-name").value = name || "";
  row.querySelector(".o-kind").value = kind || "boss";
  row.querySelector(".o-val").value = value === "" || value == null ? "" : value;
  row.querySelector(".o-price").value = price === "" || price == null ? "" : price;
  $("opts").appendChild(row);
}

/** 화면의 옵션 줄들을 [이름, 종류, 수치, 가격] 배열로 */
export function readOptionRows() {
  return [...document.querySelectorAll("#opts [data-row]")].map(r => [
    r.querySelector(".o-name").value.trim(), r.querySelector(".o-kind").value,
    r.querySelector(".o-val").value, r.querySelector(".o-price").value]);
}

export function setOptionRows(rows) {
  document.querySelectorAll("#opts [data-row]").forEach(r => r.remove());
  for (const row of rows) if (!row[1] || OPTION_KINDS[row[1]]) addOptionRow(...row);   // 없어진 종류(쿨감 등)로 저장된 줄은 건너뛴다
}

/** 옵션 줄 지우기·추가 버튼 연결. 바뀌면 onChange를 부른다 */
export function initCompare(onChange) {
  $("opts").addEventListener("click", e => {
    const del = e.target.closest(".o-del");
    if (del) { del.closest(".opt").remove(); onChange(); }
  });
  document.querySelector(".presets").addEventListener("click", e => {
    const b = e.target.closest("button[data-preset]");
    if (!b) return;
    const [name, kind, value] = b.dataset.preset.split("|");
    addOptionRow(name, kind || "boss", value, "");
    onChange();
    if (!name) { const rows = document.querySelectorAll("#opts [data-row]"); rows[rows.length - 1].querySelector(".o-name").focus(); }
  });
}

export function renderCompare({ cls, dungeon, resist, win, base, shareBlank }) {
  const options = readOptionRows()
    .map(([name, kind, v, price]) => ({ name: name || OPTION_KINDS[kind].label, kind, value: parseFloat(v) / 100, price: parseFloat(price) }))
    .filter(o => isFinite(o.value) && o.value !== 0);
  let rows = compare(base, options);

  // 가격을 넣은 옵션이 하나라도 있으면 가성비(가격 1당 상승률)로, 없으면 상승률로 순위를 매긴다
  const usePrice = rows.some(r => r.per != null);
  const keyOf = r => usePrice ? (r.per == null ? -Infinity : r.per) : (r.gain == null ? -Infinity : r.gain);
  rows = rows.slice().sort((a, b) => keyOf(b) - keyOf(a));
  const ranked = rows.filter(r => keyOf(r) > -Infinity);
  const maxGain = Math.max(0, ...rows.map(r => r.gain || 0));

  if (!rows.length) { $("verdict").textContent = "비교할 옵션을 추가하세요."; $("result").innerHTML = ""; }
  else {
    if (!ranked.length) $("verdict").textContent = "필요한 스탯창 값이 비어 있어서 계산하지 못했어요.";
    else {
      const top = ranked[0], second = ranked[1];
      let txt = usePrice
        ? `가격 대비로는 <b>${esc(top.name)}</b>${josa(top.name, "이", "가")} 가장 좋아요 (DPS +${fmt(top.gain)}, 가격 ${top.price}).`
        : `<b>${esc(top.name)}</b>${josa(top.name, "이", "가")} 가장 많이 올라요 (DPS +${fmt(top.gain)}).`;
      if (second) {
        if (usePrice) {
          const ratio = second.per / top.per;
          txt += ratio > 0.97 ? ` 2위 ${esc(second.name)}${josa(second.name, "과", "와")} 가성비 차이가 3% 안쪽이라 사실상 같아요.`
            : ` 2위 ${esc(second.name)}의 가성비는 1위의 ${Math.round(ratio * 100)}% 수준이에요.`;
        } else {
          const diff = top.gain - second.gain;
          txt += diff < 0.0005 ? ` 2위 ${esc(second.name)}${josa(second.name, "과", "와")} ${(diff * 100).toFixed(2)}%p 차이라 사실상 같아요. 구하기 쉬운 쪽을 고르세요.`
            : ` 2위 ${esc(second.name)}보다 ${(diff * 100).toFixed(2)}%p 높아요.`;
        }
      }
      $("verdict").innerHTML = txt.trim();
    }
    $("result").className = usePrice ? "priced" : "";
    const topPer = ranked.length && usePrice ? ranked[0].per : 0;
    $("result").innerHTML = `<thead><tr><th></th><th>옵션</th><th class="num">DPS 상승</th><th class="barcell"></th>${usePrice ? '<th class="num">가격</th><th class="num">가성비</th>' : ""}</tr></thead><tbody>` +
      rows.map((r, i) => {
        const best = ranked.length && r === ranked[0];
        const gain = r.gain == null ? `<span class="warn">${esc(r.miss)} 입력 필요</span>` : "+" + fmt(r.gain);
        const bar = r.gain == null || maxGain <= 0 ? "" : `<div class="bar" style="width:${Math.max(1, r.gain / maxGain * 100).toFixed(1)}%"></div>`;
        const price = usePrice ? `<td class="num">${isFinite(r.price) && r.price > 0 ? r.price : "-"}</td><td class="num gain">${r.per == null ? "-" : Math.round(r.per / topPer * 100)}</td>` : "";
        return `<tr class="${best ? "best" : ""}"><td class="rank">${keyOf(r) > -Infinity ? i + 1 : ""}</td><td class="name">${esc(r.name)} <span class="hint">${OPTION_KINDS[r.kind].label} +${(r.value * 100).toFixed(2).replace(/\.?0+$/, "")}%</span></td><td class="num gain">${gain}</td><td class="barcell">${bar}</td>${price}</tr>`;
      }).join("") + "</tbody>";
  }

  // 결과가 어떤 가정에서 나왔는지
  const notes = [`${cls}, ${dungeon} (크리저항 ${Math.round(resist * 100)}%) 기준`];
  if (has(win, "cho") || has(win, "gang")) notes.push(`딜 점유율 초월 ${win.share_cho}% : 강렬 ${win.share_gang}%` + (shareBlank ? " (비워둬서 기본값 초월 85%를 썼어요)" : ""));
  if ((win.polar || 0) > POLAR_CAP) notes.push("양극화는 천장 60%까지만 계산했어요");
  if (usePrice) notes.push("가성비는 DPS 상승 ÷ 가격이고, 1위를 100으로 놓은 값이에요. 가격을 넣은 옵션끼리만 순위를 매겼어요");
  notes.push("옵션을 하나만 추가했을 때의 상승률이에요. 여러 개를 사면 같은 옵션은 뒤로 갈수록 효율이 떨어져요");
  $("assume").innerHTML = notes.map(n => `<li>${esc(n)}</li>`).join("");
}
