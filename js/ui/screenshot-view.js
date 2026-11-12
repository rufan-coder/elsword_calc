// "스크린샷으로 채우기": 파일 고르기·끌어다 놓기·붙여넣기로 받은 이미지에서 스탯을 읽어 입력칸에 넣는다.

import { $ } from "./dom.js";
import { CLASS } from "../data/classes.js";
import { recognizeShot } from "../ocr/recognize.js";

// 스크린샷에서 채울 수 있는 칸과, 못 읽었을 때 보여 줄 이름
const FIELDS = {
  crit: "크리티컬 확률", crit_dmg: "크리티컬 데미지", maxi: "극대화", A: "공격력", A_max: "극대화 범위 내 최댓값", boss: "보스 데미지", all_skill: "모든 스킬 데미지",
  cho: "초월한 스킬 데미지", gang: "강렬한 스킬 데미지", polar: "양극화", add: "추가 피해", hp_over: "HP 50% 초과", hp_under: "HP 50% 이하", hp100: "HP 100% 이하",
  adapt: "적응력", super_adapt: "초적응력", cdr_gang: "강렬한 스킬 재사용 시간 감소", cdr_cho: "초월한 스킬 재사용 시간 감소",
};

let busy = false;

/** 스크린샷으로 채운 칸의 표시(테두리)를 지운다 */
export function clearFilled() {
  document.querySelectorAll("input.filled, input.check").forEach(el => el.classList.remove("filled", "check"));
}

/** 진행 상황·결과 안내. 한 줄 또는 여러 줄 */
function status(lines, warn) {
  const el = $("shot-status");
  lines = [].concat(lines || []).filter(Boolean);
  el.hidden = !lines.length; el.className = warn ? "warn" : ""; el.textContent = "";
  for (const t of lines) { const li = document.createElement("li"); li.textContent = t; el.appendChild(li); }
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    im.src = url;
  });
}

async function fillFromShot(file, onFilled) {
  if (busy || !file) return;
  busy = true; status("이미지를 여는 중…");
  try {
    const img = await fileToImage(file);
    const r = await recognizeShot(img, t => status(t));

    // 물리/마법 공격력 중 전직의 주 공격 타입 쪽을 쓴다
    const type = CLASS[$("cls").value].type, vals = {};
    for (const k of Object.keys(r.found)) if (k !== "patk" && k !== "matk") vals[k] = r.found[k].value;
    const atk = r.found[type === "마법" ? "matk" : "patk"];
    if (atk) vals.A = atk.value;

    // 장비를 바꿔 끼며 싸우는 게 보통이라 HP 50% 초과·이하(강역강)는 둘 중 높은 값으로 같게 넣고, 다시 확인하도록 표시
    let hpLine = "";
    if (vals.hp_over != null && vals.hp_under != null) {
      if (vals.hp_over !== vals.hp_under) {
        const hi = Math.max(vals.hp_over, vals.hp_under);
        hpLine = `HP 50% 초과·이하(강역강)는 스크린샷에 ${vals.hp_over}% / ${vals.hp_under}%로 나와 있어서 높은 쪽 ${hi}%로 같게 넣었어요. 본인 세팅과 맞는지 다시 확인하세요.`;
        vals.hp_over = vals.hp_under = hi;
      } else hpLine = `HP 50% 초과·이하(강역강)는 둘 다 ${vals.hp_over}%로 넣었어요. 장비를 바꿔 끼는 세팅이면 값이 맞는지 다시 확인하세요.`;
    } else hpLine = "HP 50% 초과·이하(강역강)를 둘 다 읽지는 못했어요. 직접 확인해서 넣으세요.";

    // 공격력 범위 툴팁의 최댓값 = 극대화 범위 내 최댓값
    let rangeLine = "";
    if (r.range) {
      if (r.range.type && r.range.type !== type) rangeLine = `스크린샷의 툴팁은 ${r.range.type} 공격력 범위인데 전직은 ${type} 타입이라 극대화 최댓값은 넣지 않았어요.`;
      else if (vals.A == null || r.range.max >= vals.A) vals.A_max = r.range.max;
    }

    const got = Object.keys(FIELDS).filter(k => vals[k] != null), miss = Object.keys(FIELDS).filter(k => vals[k] == null);
    if (!got.length) {
      status(r.panel ? "상세 스탯 창은 찾았는데 수치를 읽지 못했어요. 창이 가려지지 않게 다시 찍어 보세요." : "상세 스탯 창을 찾지 못했어요. 상세 스탯 창이 보이게 찍은 스크린샷인지 확인하세요.", true);
      return;
    }
    clearFilled();
    for (const k of got) {
      const el = $(k);
      el.value = String(Math.round(vals[k] * 100) / 100);
      el.classList.add(k === "hp_over" || k === "hp_under" ? "check" : "filled");
    }
    if (miss.includes("A_max") && !rangeLine) rangeLine = "극대화 최댓값은 주 공격력에 마우스를 올려 [공격력 범위] 툴팁이 보이게 찍어야 읽을 수 있어요.";
    status([
      `${got.length}개 칸을 채웠어요 (${type} 공격력 기준). 테두리가 표시된 칸을 스크린샷과 한 번 비교하세요.`,
      "무기 공격력과 초월 스킬 딜 점유율은 스크린샷에 없어요. 직접 입력하세요.",
      hpLine,
      miss.length ? `못 읽은 칸: ${miss.map(k => FIELDS[k]).join(", ")}.` : "",
      rangeLine,
    ], miss.length > 0);
    onFilled();
  } catch (e) {
    status(e && e.message === "image" ? "이미지 파일을 열지 못했어요." : "글자 인식 엔진을 불러오지 못했어요. 인터넷 연결을 확인하거나, 이 환경에서 막혀 있다면 직접 입력해 주세요.", true);
  } finally {
    busy = false; $("shot-file").value = "";
  }
}

/** 이벤트 연결. 칸을 채운 뒤에는 onFilled를 불러 다시 계산하게 한다 */
export function initScreenshot(onFilled) {
  const fill = file => fillFromShot(file, onFilled);
  const firstImage = files => [...(files || [])].find(f => f.type.startsWith("image/"));

  $("shot-file").addEventListener("change", e => fill(e.target.files[0]));
  document.addEventListener("paste", e => {
    const f = firstImage(e.clipboardData && e.clipboardData.files);
    if (f) { e.preventDefault(); fill(f); }
  });
  const zone = $("shot-zone");
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("drag"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", e => { e.preventDefault(); zone.classList.remove("drag"); fill(firstImage(e.dataTransfer.files)); });

  // 채운 칸을 사용자가 직접 고치면 표시를 지운다
  document.querySelector(".wrap").addEventListener("input", e => { if (e.target.classList) e.target.classList.remove("filled", "check"); });

  // 예시 스크린샷 크게 보기
  const box = $("lightbox");
  document.querySelector(".exs").addEventListener("click", e => {
    const b = e.target.closest(".ex");
    if (!b) return;
    const im = b.querySelector("img");
    $("lightbox-img").src = im.src; $("lightbox-img").alt = im.alt; box.hidden = false;
  });
  box.addEventListener("click", () => { box.hidden = true; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") box.hidden = true; });
}
