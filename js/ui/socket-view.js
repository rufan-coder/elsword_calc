// "소켓 최적화" 탭.

import { $, num, signed, arrowCells, pctOrZero, trimPct } from "./dom.js";
import { STONES, SLOT_BASE } from "../data/stones.js";
import { optimizeSockets } from "../calc/optimize-sockets.js";

const KEYS = STONES.map(s => s.key);
const NAME = Object.fromEntries(STONES.map(s => [s.key, s.name]));
// 마법석 종류 -> 그 마법석이 올리는 스탯창 값 (유강강초와 사냥석은 다른 줄에 합쳐서 보여 준다)
const STAT_OF = { crit: "crit", maxi: "maxi", boss: "boss", all: "all_skill", cho: "cho", gang: "gang" };

/** 네블론 개수를 바꾸면 전체 칸 수를 맞춰 준다 */
export function initSocket() {
  $("sk_neb").addEventListener("change", () => { $("sk_slots").value = SLOT_BASE + (num("sk_neb") || 0); });
}

export function renderSocket({ job, resist, win, setup }) {
  const out = $("sk-out"), per = {}, count = {};
  for (const k of KEYS) { per[k] = pctOrZero("sk_per_" + k); count[k] = Math.max(0, Math.round(num("sk_cnt_" + k) || 0)); }

  // 보뎀: 고른 기준 마법석으로 새로 끼우고, 지금 낀 다른 쪽이 더 좋은 수치면 그건 그대로 둔다
  const target = $("sk_boss_target").value === "boss2" ? "boss2" : "boss", other = target === "boss" ? "boss2" : "boss";
  const keepOther = per[other] > per[target] && count[other] > 0;
  per.bossTiers = [{ key: target, value: per[target], limit: Infinity }].concat(keepOther ? [{ key: other, value: per[other], limit: count[other] }] : []);

  // 지금 낀 칸 수 x 한 칸 수치 = 먼저 빼야 하는 수치. 유강강초는 강렬·초월 양쪽에서 뺀다
  const current = {
    crit: count.crit * per.crit, maxi: count.maxi * per.maxi, boss: count.boss * per.boss + count.boss2 * per.boss2, all: count.all * per.all,
    cho: count.cho * per.cho + count.both * per.both, gang: count.gang * per.gang + count.both * per.both,
  };

  const slots = Math.floor(num("sk_slots") || 0), nebulon = num("sk_neb") || 0, full = SLOT_BASE + nebulon;
  const empty = Math.max(0, Math.round(num("sk_cnt_empty") || 0));
  const entered = KEYS.reduce((a, k) => a + count[k], 0) + empty, diff = entered - slots;
  $("sk-scope").textContent = `전체 소켓은 ${full}칸이에요 (기본 ${SLOT_BASE}칸 + 네블론 ${nebulon}개, 무기 소켓은 한 칸을 2칸으로 계산). ` +
    (slots === full ? "지금은 전체를 다시 배분해요. 일부만 바꾸려면 칸 수를 직접 줄이세요." : `지금은 그중 ${slots}칸만 다시 배분해요.`);

  // 입력한 칸 수의 합이 맞지 않으면 누락이 있다는 뜻이라 계산하지 않는다
  const counter = $("sk-count");
  counter.className = diff === 0 || slots <= 0 ? "hint" : "warn";
  counter.textContent = slots <= 0 ? "" : `지금 낀 칸 수 합계 ${entered} / ${slots}칸 · ` + (diff === 0 ? "딱 맞아요" : diff < 0 ? `${-diff}칸이 덜 입력됐어요` : `${diff}칸이 더 입력됐어요`);
  if (slots <= 0) { out.innerHTML = `<p class="hint">다시 배분할 소켓 칸 수를 넣으면 가장 좋은 마법석 조합을 계산해요.</p>`; return; }
  if (diff !== 0) {
    out.innerHTML = `<p class="warn">지금 낀 칸 수 합계가 ${entered}칸이라 ${diff < 0 ? `${-diff}칸이 덜` : `${diff}칸이 더`} 입력됐어요. 다시 배분할 ${slots}칸과 맞추면 계산해요.</p>`;
    return;
  }

  const r = optimizeSockets(win, job, resist, setup, slots, per, current);
  for (const k of KEYS) r.counts[k] = r.counts[k] || 0;
  if (!KEYS.some(k => r.counts[k] > 0)) { out.innerHTML = `<p class="warn">계산할 수 있는 마법석이 없어요. 스탯창 값과 한 칸 수치를 확인하세요.</p>`; return; }

  const list = keys => keys.map(k => `${NAME[k]} ${Math.abs(r.counts[k] - count[k])}칸`).join(", ");
  const minus = KEYS.filter(k => r.counts[k] < count[k]), plus = KEYS.filter(k => r.counts[k] > count[k]);
  let verdict;
  if (!minus.length && !plus.length) verdict = `지금 구성이 이미 최적이에요. 바꿀 필요가 없어요.`;
  else if (!minus.length) verdict = `빈 ${empty}칸에 <b>${list(plus)}</b>을 끼우면 DPS가 <b>${signed(r.gain)}</b> 올라요.`;
  else if (r.gain < 0.00005) verdict = `${list(minus)}을 ${list(plus)}으로 바꿔도 DPS가 같아요. 지금 구성 그대로 둬도 돼요.`;
  else verdict = `${list(minus)}을 빼고 <b>${list(plus)}</b>을 끼우면 DPS가 <b>${signed(r.gain)}</b> 올라요.`;

  const row = k => {
    const d = r.counts[k] - count[k], stat = STAT_OF[k];
    const statCells = !stat || r.after[stat] == null
      ? `<td class="num muted" colspan="2">${k === "both" ? "강렬·초월에 반영" : k === "boss2" ? "위 보스 데미지에 합산" : "-"}</td>`
      : arrowCells(win[stat] || 0, r.after[stat]);
    return `<tr><td class="name">${NAME[k]}</td><td class="num">${count[k]}</td><td class="num ${d ? "up" : "muted"}">${r.counts[k]}${d ? ` (${d > 0 ? "+" : "−"}${Math.abs(d)})` : ""}</td>${statCells}</tr>`;
  };
  out.innerHTML = `<p class="verdict">${verdict}</p>
      <div class="tbl-wrap"><table><thead><tr><th>마법석</th><th class="num">지금</th><th class="num">최적</th><th class="num" colspan="2">스탯창 (현재 → 최적)</th></tr></thead><tbody>
      ${KEYS.map(row).join("")}
      </tbody></table></div>
      <ul class="assume">
        <li>${slots}칸을 채우는 모든 조합 중 DPS가 가장 높은 걸 골랐어요${empty ? `. 그중 ${empty}칸은 지금 빈 칸이에요` : ""}</li>
        <li>지금 낀 마법석도 "한 칸 수치"와 같은 수치라고 보고 계산했어요. 실제 수치가 더 낮으면 상승률은 이보다 커요</li>
        <li>${keepOther ? `보뎀은 지금 낀 ${NAME[other]}(${trimPct(per[other])})은 그대로 두고, 새로 끼우는 칸만 ${NAME[target]}(${trimPct(per[target])})으로 계산했어요`
          : `보뎀은 전부 ${NAME[target]}(${trimPct(per[target])})으로 끼운다고 봤어요${count[other] > 0 ? `. 지금 낀 ${NAME[other]}도 교체 대상이에요` : ""}`}</li>
        <li>유강강초는 한 칸에 강렬·초월 스뎀이 각각 그 수치만큼 오르는 마법석으로 계산했어요</li>
        <li>한 칸 수치를 0으로 두면 그 마법석은 후보에서 빠져요</li>
        ${r.used < r.slots ? `<li>${r.slots - r.used}칸은 채울 수 있는 마법석이 없어서 남겼어요</li>` : ""}
      </ul>`;
}
