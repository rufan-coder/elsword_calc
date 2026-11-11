import { test } from "node:test";
import assert from "node:assert/strict";
import { critFromStat, statFromCrit, maxiFromStat, statFromMaxi } from "../js/calc/diminish.js";
import { near } from "./helpers.js";

test("크리티컬 점감: 구간 경계", () => {
  near(critFromStat(0.40), 0.40);     // 40%까지는 그대로
  near(critFromStat(0.75), 0.68);     // 다음 35%는 0.8배
  near(critFromStat(1.05), 0.86);     // 다음 30%는 0.6배
  near(critFromStat(1.40), 1.00);     // 다음 35%는 0.4배
  near(critFromStat(2.00), 1.00);     // 그 이상은 100%
});

test("극대화 점감: 구간 경계", () => {
  near(maxiFromStat(0.40), 0.40);
  near(maxiFromStat(0.80), 0.70);
  near(maxiFromStat(1.20), 0.90);
  near(maxiFromStat(1.60), 1.00);
});

test("점감을 풀었다가 다시 걸면 원래 값", () => {
  for (let p = 0; p <= 1.0001; p += 0.01) {
    near(critFromStat(statFromCrit(p)), p, 9);
    near(maxiFromStat(statFromMaxi(p)), p, 9);
  }
});

test("스탯이 많을수록 확률은 줄지 않는다", () => {
  for (let s = 0; s < 1.8; s += 0.01) {
    assert.ok(critFromStat(s + 0.01) >= critFromStat(s));
    assert.ok(maxiFromStat(s + 0.01) >= maxiFromStat(s));
  }
});
