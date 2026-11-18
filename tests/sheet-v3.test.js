// 실질전투력 시트 ver.3.0.19 반영 확인.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLASS, CLASS_SKILLS, withClassSkill } from "../js/data/classes.js";
import { DUNGEONS } from "../js/data/dungeons.js";
import { SETS } from "../js/data/accessories.js";
import { resolve, critFinal, critMult, critFactor, maxiFinal, maxiMult, dpsIndex } from "../js/calc/stats.js";
import { capOver } from "../js/calc/caps.js";
import { near } from "./helpers.js";

test("시트 ver.3.0.19 Main 예시(페이탈 팬텀, 샤프슈터 체인지)의 크리·크뎀·극대 중간값과 같다", () => {
  // 엘 하우스(강화), 하의·신발 11강, 황색, 파티 크뎀 10%, 금빛 각인 크뎀 5%(평균 기여 1.0625%), 격려 원석 쿨감 30%, 네블론 글리터 보스
  const job = withClassSkill("페이탈 팬텀", "체인지");
  const setup = { town_crit: 0.05, town_maxi: 0.05, crit_mults: [0.13, 0.08], maxi_mults: [0.13, 0.08], cd_base_mults: [0.10, 0.010625], guild_boss: 0.025, enc_uptime: 36 / 66 };
  const s = resolve({ crit: 0.864, crit_dmg: 1.915, maxi: 0.6588, A: 170165, A_max: 233065 }, job, 0.30, setup);
  near(critFinal(s), 0.989841, 6);                                   // 시트 C449 비크리 전환 후 최종 크리 확률
  near(s.crit_dmg, 2.082531, 6);                                     // C453 최종합연산 반영 크리티컬 데미지
  near(critMult(s), 2.071534, 6);                                    // C457 크리티컬 기대 피해 배율
  near(maxiFinal(s), 0.999765, 6);                                   // C423 최종 극대화 확률
  near(maxiMult(maxiFinal(s), s.A, s.A_max), 233050.1883 / 170165, 8);   // C424 극대화 반영 평균 공격력 ÷ 공격력
});

test("직업 패시브: 시트에서 바뀐 값이 들어 있다", () => {
  const c = CLASS;
  near(c["임모탈"].crit_s, 0.23); near(c["임모탈"].cd_base, 0.10);    // [진] 팬텀 소드 기본 포함
  near(c["리히터"].cd_s, 0.40); near(c["리히터"].cd_base, 0);
  near(c["셀레스티아"].boss, 0.25); near(c["프로피티스"].boss, 0.24); near(c["라디언트 소울"].boss, 0.18);
  near(c["레이지 하츠"].cd_base, 0.21); near(c["레이지 하츠"].cd_final, 0.12);
  near(c["레버넌트"].hp_under, 0.034); near(c["코드:얼티메이트"].hp_under, 1.14 / 1.1 - 1, 9);
  near(c["템페스트 버스터"].crit_s, 0.21); near(c["템페스트 버스터"].maxi_s, 0.21);
  near(c["블러디 퀸"].cd_final, 0); near(c["블러디 퀸"].hp_crit_over, 0.15); near(c["블러디 퀸"].hp_crit_under, 0.25);
  near(c["메타모르피"].cd_s, 0.27); near(c["메타모르피"].atk_s, 0.20);
  near(c["젬블리스"].cdr_cap, 0.24); assert.equal(c["트윈즈 피카로"].cdr_cap, null);
});

test("선택 스킬: 룬 마스터 크리티컬 소드, 페이탈 팬텀 샤프슈터 신드롬 (기본은 체인지)", () => {
  assert.deepEqual(Object.keys(CLASS_SKILLS).sort(), ["룬 마스터", "페이탈 팬텀"]);
  near(withClassSkill("룬 마스터", "체인지").cd_base, 0.20);
  const normal = withClassSkill("룬 마스터", "일반");
  near(normal.cd_base, 1.7 / 1.5 - 1, 9); near(normal.crit_m, 0.15 + 0.10);
  near(withClassSkill("룬 마스터", "사용 안 함").cd_base, 0);
  near(withClassSkill("페이탈 팬텀", "체인지").crit_s, 0.10);
  near(withClassSkill("페이탈 팬텀", "일반").crit_s, 0);
  assert.equal(withClassSkill("페이탈 팬텀", "모르는 값").skillChoice, "체인지");   // 저장값이 이상하면 기본값
  assert.equal(withClassSkill("트윈즈 피카로", "체인지"), CLASS["트윈즈 피카로"]);  // 선택 스킬이 없는 전직은 그대로
});

test("블러디 퀸 갈증: 두 HP 구간 피해가 같으면 크리 시 피해 20%와 같고, 다르면 피해가 큰 구간 쪽으로 기운다", () => {
  const job = CLASS["블러디 퀸"], setup = { town_crit: 0, town_maxi: 0, crit_mults: [], maxi_mults: [], cd_base_mults: [], guild_boss: 0, enc_uptime: 0 };
  const flat = resolve({ crit: 0.7, crit_dmg: 2.0, hp_over: 0.3, hp_under: 0.3 }, job, 0, setup);
  const p = critFinal(flat);
  near(critMult(flat), 1 - p + p * flat.crit_dmg * 1.20, 12);
  const under = resolve({ crit: 0.7, crit_dmg: 2.0, hp_over: 0, hp_under: 0.5 }, job, 0, setup);
  const w = (1 * 0.15 + 1.5 * 0.25) / 2.5;                            // 이하 구간 피해 비중 1.5 : 1
  near(critMult(under), 1 - p + p * under.crit_dmg * (1 + w), 12);
  near(critFactor({ crit_dmg: 2.0, hp_over: 0, hp_under: 0.5 }, job, 0, setup, 0.7), critMult(under), 12);   // 크극·소켓 최적화도 같은 식
});

test("메타모르피: HP 연동 공격력 20%가 스탯형 공격력 %에 더해진다", () => {
  const setup = { town_crit: 0, town_maxi: 0, crit_mults: [], maxi_mults: [], cd_base_mults: [], guild_boss: 0, enc_uptime: 0 };
  const win = { atk_pct: 0.8 }, more = { atk_pct: 0.9 };
  const meta = CLASS["메타모르피"], other = CLASS["트와일라잇"];
  near(dpsIndex(resolve(more, meta, 0, setup)) / dpsIndex(resolve(win, meta, 0, setup)), 2.1 / 2.0, 12);
  near(dpsIndex(resolve(more, other, 0, setup)) / dpsIndex(resolve(win, other, 0, setup)), 1.9 / 1.8, 12);
});

test("젬블리스: 쿨감 상한 24%를 넘은 만큼을 상한 초과로 본다", () => {
  near(capOver({ cdr_cho: 0.30 }, {}, CLASS["젬블리스"]).cdr_cho, 0.06, 10);
  assert.equal(capOver({ cdr_cho: 0.30 }, {}, CLASS["트윈즈 피카로"]).cdr_cho, undefined);
});

test("던전·세트: 새 던전이 있고, 엠파이어 레인 무악 3셋의 곱연 크뎀은 빠졌다", () => {
  assert.deepEqual(DUNGEONS["모나테라·티르노그"], { debuff: 0.90, critResist: 0 });
  assert.deepEqual(DUNGEONS["마계 디버프 10% 지역"], { debuff: 0.10, critResist: 0 });
  assert.ok(DUNGEONS["네블론 레이드"] && DUNGEONS["크리저항 없는 던전"]);   // 저장값이 가리키는 예전 이름은 그대로
  assert.deepEqual(SETS["엠파이어 레인 무악"].stages[3], { all_skill: 0.08 });
});

test("옵션 비교: 시트 ver.3.0.19 Main '옵션 효율표'(각 1%)와 같다", async () => {
  const { compare } = await import("../js/calc/compare.js");
  const { statAtkPct } = await import("../js/calc/stats.js");
  // 시트 Main 예시 (페이탈 팬텀 체인지, 엘 하우스(강화), 네블론). 강렬 점유율 15%는 스뎀 적용 전 기준이라 화면이 받는 '보이는 비중'으로 바꿔 넣는다
  const seenCho = 0.85 * 2.33 / (0.85 * 2.33 + 0.15 * 2.03);
  const win = { crit: 0.864, crit_dmg: 1.915, maxi: 0.6588, A: 170165, A_max: 233065, W: 56380.4, boss: 2.087, all_skill: 1.18, cho: 1.33, gang: 1.03,
    share_cho: seenCho * 100, share_gang: (1 - seenCho) * 100, polar: 0.6, add: 1.027, hp_over: 0.45, hp_under: 0.45, hp100: 0.485, adapt: 0.6, super_adapt: 0.21 };   // 초적응력: 스탯창 18% + 시트가 따로 더하는 3% (C471)
  win.atk_pct = statAtkPct(win.A, win.A_max, win.W);
  const setup = { town_crit: 0.05, town_maxi: 0.05, town_boss: 0.02, town_adapt: 0, crit_mults: [0.13, 0.08], maxi_mults: [0.13, 0.08], cd_base_mults: [0.10, 0.010625], guild_boss: 0.025, enc_uptime: 36 / 66, debuff: 0.95 };
  const base = resolve(win, withClassSkill("페이탈 팬텀", "체인지"), 0.30, setup);
  const sheet = {   // 시트 O9:O28 (1% 올렸을 때 DPS 상승량)
    super_adapt: 0.011627906977, cd_mult: 0.007967963489, hp100: 0.006734006734, add: 0.004933399112, atk_pct: 0.004929923688,
    crit_dmg: 0.004778299351, all_skill: 0.004587155963, cho: 0.003719912473, hp_over: 0.003448275862, hp_under: 0.003448275862,
    boss: 0.00319284802, crit: 0.001159546012, gang: 0.000656455142, maxi: 6.3555804e-05, polar: 0, adapt: 0,
  };
  const rows = compare(base, Object.keys(sheet).map(kind => ({ name: kind, kind, value: 0.01 })));
  for (const r of rows) {
    assert.equal(typeof r.gain, "number", r.kind);
    assert.ok(Math.abs(r.gain - sheet[r.kind]) < 1e-9 + 1e-6 * sheet[r.kind], `${r.kind}: ${r.gain} vs ${sheet[r.kind]}`);
  }
});
