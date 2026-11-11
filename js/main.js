// 시작점. 각 화면 모듈을 묶고, 입력이 바뀔 때마다 전체를 다시 계산해 그린다.
//
//   입력칸 --readInputs()--> 스탯창 값·버프 --resolve()--> 실전 수치 --> 각 탭이 자기 결과를 그림

import { $ } from "./ui/dom.js";
import { DEFAULTS, loadState, snapshot, save, readSaved, saveTab, readTab } from "./ui/state.js";
import { initInputs, readInputs } from "./ui/inputs.js";
import { renderSummary } from "./ui/summary.js";
import { initCompare, renderCompare } from "./ui/compare-view.js";
import { renderCkb } from "./ui/ckb-view.js";
import { initSocket, renderSocket, syncSocketControls } from "./ui/socket-view.js";
import { initScreenshot, clearFilled } from "./ui/screenshot-view.js";
import { resolve } from "./calc/stats.js";

const TABS = ["compare", "ckb", "socket"];
let tab = "compare";
let defaultSnapshot = "";

function setTab(name) {
  tab = TABS.includes(name) ? name : "compare";
  for (const t of TABS) { $("tab-" + t).setAttribute("aria-selected", t === tab); $("pane-" + t).hidden = t !== tab; }
  saveTab(tab);
}

/** 결과 쪽이 화면 높이에 다 들어올 때만 스크롤을 따라오게 한다 */
function fitSticky() {
  const col = document.querySelector(".col.results");
  col.classList.remove("stick");
  col.classList.toggle("stick", col.offsetHeight <= window.innerHeight - 24);
}

function render() {
  const input = readInputs();
  const ctx = Object.assign(input, { base: resolve(input.win, input.job, input.resist, input.setup) });

  renderSummary(ctx);
  renderCompare(ctx);
  if (tab === "ckb") renderCkb(ctx);      // 최적화는 계산이 무거워서 보고 있는 탭만 그린다
  if (tab === "socket") renderSocket(ctx);
  fitSticky();

  const snap = snapshot();
  $("example-note").hidden = JSON.stringify(snap) !== defaultSnapshot;   // 예시 값 그대로일 때만 안내를 보여 준다
  save(snap);
}

// ----- 시작 -----
initInputs();
loadState(DEFAULTS);
defaultSnapshot = JSON.stringify(snapshot());
const saved = readSaved();
if (saved) loadState(saved);
syncSocketControls();

const wrap = document.querySelector(".wrap");
wrap.addEventListener("input", render);
wrap.addEventListener("change", render);
initCompare(render);
initSocket();
initScreenshot(render);
$("reset").addEventListener("click", () => { loadState(DEFAULTS); syncSocketControls(); clearFilled(); render(); });
document.querySelector(".tabs").addEventListener("click", e => {
  const b = e.target.closest('[role="tab"]');
  if (b) { setTab(b.id.slice(4)); render(); }
});
window.addEventListener("resize", fitSticky);

setTab(readTab());
render();
