import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, dpsIndex, adaptFinal, adaptMult } from "../js/calc/stats.js";
import { OPTION_KINDS } from "../js/calc/compare.js";
import { compare } from "../js/calc/compare.js";
import { buildSetup } from "../js/calc/buffs.js";
import { near, PICARO } from "./helpers.js";

const { job, resist, setup } = PICARO;
const withDebuff = (s, debuff) => ({ ...s, debuff });

test("적응력: 시트 <계산기> 값과 같다 (적응력 60%, 초적응력 10%, 마계 디버프 95%)", () => {
  const s = resolve({ adapt: 0.60, super_adapt: 0.10 }, job, resist, withDebuff(setup, 0.95));
  near(adaptFinal(s), 0.70);
  near(adaptMult(s) / (1 - 0.95) - 1, 14.0);   // 시트: 적응력으로 증가한 최종데미지 1400%
});

test("적응력: 60%를 넘는 적응력은 버려지고, 초적응력은 그 위에 더해진다", () => {
  const s = resolve({ adapt: 0.59, super_adapt: 0.10 }, job, resist, withDebuff(setup, 0.95));
  const [a1, a2, s3] = compare(s, [{ kind: "adapt", value: 0.01 }, { kind: "adapt", value: 0.02 }, { kind: "super_adapt", value: 0.03 }]).map(r => r.gain);
  near(a1, 0.75 / 0.74 - 1, 8);   // 59 -> 60%
  near(a2, a1, 10);               // 61%가 돼도 60%까지만
  near(s3, 0.77 / 0.74 - 1, 8);
});

test("적응력: 디버프를 다 막았으면 더 올려도 그대로다", () => {
  const s = resolve({ adapt: 0.60, super_adapt: 0.40 }, job, resist, withDebuff(setup, 0.95));
  near(adaptMult(s), 1, 10);
  near(compare(s, [{ kind: "super_adapt", value: 0.05 }])[0].gain, 0, 10);
});

test("재사용 시간 감소: DPS에는 넣지 않는다 (옵션 비교에도 없다)", () => {
  const s = resolve({ ...PICARO.win, cdr_gang: 0.20, cdr_cho: 0.20 }, job, resist, setup);
  near(dpsIndex({ ...s, cdr_gang: 0.35, cdr_cho: 0.35 }) / dpsIndex(s), 1, 12);
  assert.ok(!Object.keys(OPTION_KINDS).some(k => k.startsWith("cdr")));
});

test("마을 버프: 수색대원의 결의는 적응력 2%와 보뎀 2%를 더한다", () => {
  const { setup: st } = buildSetup({ town: "수색대원의 결의", pantsEnhance: 11, shoesEnhance: 11, yellow: true, stoneCdr: 0.3, stoneDur: 0 });
  const s = resolve({ boss: 1.9, adapt: 0.55 }, job, resist, { ...st, debuff: 0.95 });
  near(s.boss, 1.9 + 0.025 + 0.02, 10);
  near(adaptFinal(s), 0.57, 10);
});

test("적응력·쿨감을 비워 두면 다른 옵션 결과는 예전과 같다", () => {
  const base = resolve(PICARO.win, job, resist, withDebuff(setup, 0.95));
  const withThem = resolve({ ...PICARO.win, adapt: 0.59, super_adapt: 0.1, cdr_gang: 0.32, cdr_cho: 0.32 }, job, resist, withDebuff(setup, 0.95));
  const opts = [{ kind: "boss", value: 0.05 }, { kind: "crit", value: 0.06 }, { kind: "cho", value: 0.05 }];
  const a = compare(base, opts), b = compare(withThem, opts);
  for (let i = 0; i < opts.length; i++) near(a[i].gain, b[i].gain, 10);
  assert.ok(dpsIndex(withThem) !== dpsIndex(base));   // 적응력은 DPS에 들어간다
});
