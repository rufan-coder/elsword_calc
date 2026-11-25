// 장비 데이터: 시트 ver.3.0.22 '교체 변동값'·'현재·교체 후 계산'의 예시 값과 같은지.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ENHANCE_MULT, WEAPON_ATTACK, WEAPON_TYPES, ARMOR_BASE_ATTACK, ARMOR_TYPES, ARMOR_PART_ENHANCE, ARMOR_SETS, EQUIP_OPTIONS, EQUIP_OPTION_CATEGORIES, CARTRIDGES } from "../js/data/equipment.js";
import { near } from "./helpers.js";

test("강화 배율: 0강 1배, 10강 2.15배, 13강 3.35배", () => {
  assert.equal(ENHANCE_MULT.length, 14);
  near(ENHANCE_MULT[0], 1); near(ENHANCE_MULT[10], 2.15); near(ENHANCE_MULT[13], 3.35);
});

test("무기 공격력: 시트 예시(사룡무 12강 6해방, 1티어, 스탯창 무기 공격력 56380.4)의 남은 공격력 레벨 64.01", () => {
  const w = WEAPON_TYPES["사룡무"], c = WEAPON_ATTACK[1];
  const level = (56380.4 / ENHANCE_MULT[12] - c.base) / c.perLevel - w.level - w.release[6].atk_lv;
  near(level, 64.01257862, 6);   // 교체 변동값 D117
  assert.equal(w.mana, null);
  assert.deepEqual(WEAPON_TYPES["단죄무"].mana[13], { atk_lv: 10, atk_pct: 0.05, crit_dmg: 0.1, all_skill: 0.1 });
  assert.equal(WEAPON_TYPES["암귀무"].set, "심연 레이드 세트");
});

test("방어구 고정 공격력 = 기본 x 강화 배율 + 재련 (네블론 상의 12강 21재련 3355.5, 장갑 11강 18재련 3348.65)", () => {
  const fixed = (slot, enh, ref) => ARMOR_BASE_ATTACK[1][slot] * ENHANCE_MULT[enh] + ARMOR_TYPES["네블론"].reforge[ref].fixed_atk;
  near(fixed("top", 12, 21), 3355.5, 6); near(fixed("gloves", 11, 18), 3348.65, 6);   // 교체 변동값 C138, D222
  assert.deepEqual(ARMOR_TYPES["네블론"].enhance[11], { boss: 0.05, super_adapt: 0.02 });
  assert.deepEqual(ARMOR_TYPES["엑사스케일"].enhance[11], { boss: 0.05, adapt: 0.01 });
  near(ARMOR_TYPES["엑사스케일"].reforge[21].fixed_atk, 2000); near(ARMOR_TYPES["테네브로스"].reforge[21].fixed_atk, 1500);
  near(ARMOR_TYPES["네블론"].reforge[21].super_adapt, 0.005);
});

test("부위 강화: 상의 12강 최종뎀 x1.14, 장갑 12강 모스뎀 60%", () => {
  const p = ARMOR_PART_ENHANCE;
  near(1 + p.top.final.base + 12 * p.top.final.per, 1.14, 12);     // 현재·교체 후 계산 C322
  near(p.gloves.all_skill.base + 12 * p.gloves.all_skill.per, 0.6, 12);   // 교체 변동값 C231
});

test("방어구 세트·옵션·카트리지 표가 서로 맞물린다", () => {
  near(ARMOR_SETS["연산"].hidden.final, 0.20); near(ARMOR_SETS["순환"].party.party_cd, 0.10);
  // 범주 목록에 있는 일반 옵션은 모두 반영 스탯이 정해져 있다 (카트리지는 CARTRIDGES 에)
  for (const gear of Object.values(EQUIP_OPTION_CATEGORIES)) for (const cat of Object.values(gear)) for (const o of cat.options) {
    const name = typeof o === "string" ? o : o.name, input = typeof o === "string" ? null : o.input;
    if (input === "카트리지 레벨" || name === "미장착") assert.ok(CARTRIDGES[name] || name === "미장착", name);
    else assert.ok(EQUIP_OPTIONS[name], name);
  }
  assert.deepEqual(EQUIP_OPTIONS["유강강초(회로)"].stats, ["gang", "cho"]);
});
