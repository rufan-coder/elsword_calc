import { test } from "node:test";
import assert from "node:assert/strict";
import { CLASS, PASSIVE_SOURCES } from "../js/data/classes.js";

const FIELDS = new Set(["crit", "crit_dmg", "maxi", "boss", "hp", "skill", "etc"]);

test("패시브 출처 메모: 모든 전직이 있고, 이름과 칸이 틀리지 않았다", () => {
  for (const name of Object.keys(CLASS)) assert.ok(PASSIVE_SOURCES[name], `${name} 메모가 없음`);
  for (const [name, memo] of Object.entries(PASSIVE_SOURCES)) {
    assert.ok(CLASS[name], `${name}: 전직 표에 없는 이름`);
    for (const [k, v] of Object.entries(memo)) {
      assert.ok(FIELDS.has(k), `${name}: 모르는 칸 ${k}`);
      assert.equal(typeof v, "string", `${name}.${k}`);
    }
  }
});
