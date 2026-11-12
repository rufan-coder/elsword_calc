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
import { initGear, renderGear } from "./ui/gear-view.js";
import { resolve } from "./calc/stats.js";
import { BUILD } from "./build.js";

const TABS = ["compare", "ckb", "socket"];
const PAGES = ["spec", "gear"];   // 위 메뉴: 스펙 계산, 악세 세팅
let tab = "compare", page = "spec";
let defaultSnapshot = "";

function setTab(name) {
  tab = TABS.includes(name) ? name : "compare";
  for (const t of TABS) { $("tab-" + t).setAttribute("aria-selected", t === tab); $("pane-" + t).hidden = t !== tab; }
  saveTab(tab);
}

/** 위 메뉴로 화면을 바꾼다 (주소 끝의 #spec, #gear) */
function setPage(name) {
  page = PAGES.includes(name) ? name : "spec";
  document.body.dataset.page = page;
  for (const p of PAGES) $("page-" + p).hidden = p !== page;
  for (const a of document.querySelectorAll(".menu a")) a.toggleAttribute("aria-current", a.dataset.page === page);
}

/** 결과 쪽이 화면 높이에 다 들어올 때만 스크롤을 따라오게 한다 */
function fitSticky() {
  for (const col of document.querySelectorAll(".page:not([hidden]) .col.results")) {
    col.classList.remove("stick");
    col.classList.toggle("stick", col.offsetHeight <= window.innerHeight - 24);
  }
}

function render() {
  const input = readInputs();
  const ctx = Object.assign(input, { base: resolve(input.win, input.job, input.resist, input.setup) });

  if (page === "gear") renderGear(ctx);
  else {
    renderSummary(ctx);
    renderCompare(ctx);
    if (tab === "ckb") renderCkb(ctx);      // 최적화는 계산이 무거워서 보고 있는 탭만 그린다
    if (tab === "socket") renderSocket(ctx);
  }
  fitSticky();

  const snap = snapshot();
  $("example-note").hidden = JSON.stringify(snap) !== defaultSnapshot;   // 예시 값 그대로일 때만 안내를 보여 준다
  save(snap);
}

// ----- 시작 -----
function start() {
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
  initGear(render);
  window.addEventListener("hashchange", () => { setPage(location.hash.slice(1)); render(); window.scrollTo(0, 0); });
  setPage(location.hash.slice(1));
  $("reset").addEventListener("click", () => { loadState(DEFAULTS); syncSocketControls(); clearFilled(); render(); });
  document.querySelector(".tabs").addEventListener("click", e => {
    const b = e.target.closest('[role="tab"]');
    if (b) { setTab(b.id.slice(4)); render(); }
  });
  window.addEventListener("resize", fitSticky);

  setTab(readTab());
  render();
}

// 화면(index.html)과 스크립트의 배포 버전이 다르면 예전 파일이 섞여 열린 것이다.
// 파일을 새로 받아 다시 열고(index.html 의 __refreshFiles), 이미 한 번 해 봤다면 그냥 시작한다.
const pageBuild = document.querySelector('meta[name="build"]')?.content;
const mixed = !!pageBuild && pageBuild !== BUILD;
if (!(mixed && window.__refreshFiles && window.__refreshFiles())) {
  start();
  window.__appReady = true;   // 여기까지 왔으면 정상으로 열린 것. 이후의 오류로는 다시 열지 않는다
  if (!mixed) { try { sessionStorage.removeItem("elsword-calc-refreshed"); } catch (e) { /* 저장이 막힌 환경 */ } }
}
