import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "../js/calc/stats.js";
import { compare } from "../js/calc/compare.js";
import { near, PICARO } from "./helpers.js";

const gains = (base, options) => Object.fromEntries(compare(base, options).map(r => [r.name, r.gain]));

test("스킬 데미지·보뎀 옵션 비교 (초월 100% 캐릭터)", () => {
  const base = { boss: 1.92, gang: 0.991, cho: 1.30, share_gang: 0, share_cho: 100 };
  const g = gains(base, [
    { name: "지트마", kind: "cho", value: 0.05 }, { name: "힘트마", kind: "boss", value: 0.06 },
    { name: "기민석", kind: "both", value: 0.04 }, { name: "사냥석", kind: "boss", value: 0.05 },
  ]);
  near(g["지트마"], 0.02174, 5); near(g["힘트마"], 0.02055, 5); near(g["기민석"], 0.01739, 5); near(g["사냥석"], 0.01712, 5);
});

test("크리·극대 옵션은 버프와 점감을 거친 뒤의 가치로 계산된다", () => {
  const base = resolve(PICARO.win, PICARO.job, PICARO.resist, PICARO.setup);
  const g = gains(base, [
    { name: "크뎀 5%", kind: "crit_dmg", value: 0.05 }, { name: "초스뎀 2.5%", kind: "cho", value: 0.025 }, { name: "보뎀 3%", kind: "boss", value: 0.03 },
    { name: "크리 6%", kind: "crit", value: 0.06 }, { name: "극대 6%", kind: "maxi", value: 0.06 },
  ]);
  near(g["크뎀 5%"], 0.02075, 5); near(g["초스뎀 2.5%"], 0.01035, 5); near(g["보뎀 3%"], 0.01026, 5);
  near(g["크리 6%"], 0.00788, 5); near(g["극대 6%"], 0.00260, 5);
});

test("필요한 입력이 없으면 계산하지 않고 무엇이 비었는지 알려 준다", () => {
  const [r] = compare({ boss: 1.9 }, [{ name: "크리", kind: "crit", value: 0.06 }]);
  assert.equal(r.gain, null);
  assert.match(r.miss, /크리티컬/);
});

test("가격을 넣으면 가격 1당 상승률이 나온다", () => {
  const [a, b] = compare({ boss: 1.0 }, [{ name: "a", kind: "boss", value: 0.1, price: 100 }, { name: "b", kind: "boss", value: 0.1 }]);
  near(a.per, a.gain / 100, 9);
  assert.equal(b.per, null);
});
