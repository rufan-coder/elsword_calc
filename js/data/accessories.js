// 악세사리·아바타 데이터. 실투력 시트 ver.2.21.4 의 숨겨진 <아이템 테이블> 탭에서 옮겼다 (악세 교체·세트 계산용).
// 새 악세가 나오면 ACCESSORIES 에 한 줄, 새 세트면 SETS 에 한 줄 더한다.
//
// 능력치 키. 값은 비율이다 (0.02 = 2%)
//   계산기가 쓰는 것
//     crit, maxi           크리티컬·극대화 (스텟 %, 점감 전에 더해진다)
//     crit_dmg             크리티컬 데미지
//     patk_pct, matk_pct   물리·마법 공격력 % (스텟)
//     boss, polar, all_skill, cho, gang, hp_over, hp_under, hp100
//     add                  공격 시 추가 지속 피해 (시트의 "추피 n% 3초간"의 n%)
//     adapt                적응력
//     cdr_all              모든 스킬 재사용 시간 감소 (강렬·초월 모두에 더해진다)
//     cd_mult              기본 크뎀(150%)에 곱연산되는 크리티컬 데미지
//     final                최종 데미지 (배율 - 1. 0.10 = 최종 데미지 x1.10)
//   계산기가 다루지 않는 것 (보여 주기만 한다)
//     patk, matk (고정 공격력), aspd (동작 속도), extra_dmg (추가 데미지), pdef_ign, mdef_ign (방어 무시),
//     tough (강인한 스킬 데미지), active (액티브 스킬 데미지)
// 시트의 "시줌 잠재 추가효과" 칸은 옮기지 않았다.
// 이름은 시트를 따르되, 게임 표기와 다른 셋은 게임 표기로 고쳤다 (선장의 트리코른, 바리온의 털장식, 어둠의 기운이 담긴 헤일로).

/** 악세 부위. 부위마다 아바타 악세(무악) 한 칸과 일반 악세 한 칸이 따로 있다. 반지는 일반 악세만 두 칸 */
export const ACC_SLOTS = [
  { key: "weapon", name: "무기" }, { key: "support", name: "서포트 유닛" },
  { key: "face_top", name: "얼굴(상)" }, { key: "face_mid", name: "얼굴(중)" }, { key: "face_low", name: "얼굴(하)" },
  { key: "top", name: "상의" }, { key: "bottom", name: "하의" }, { key: "arm", name: "팔" },
  { key: "ear", name: "귀걸이" }, { key: "neck", name: "목걸이" }, { key: "ring", name: "반지" },
];
export const ACC_LAYERS = {
  avatar: { name: "아바타 액세서리", rings: 1 },
  normal: { name: "일반 액세서리", rings: 2 },
};

/** 아바타 악세(무악) 세트 효과는 동시에 이 개수까지만 켜진다 (어느 세트를 켤지는 고를 수 있다) */
export const AVATAR_SET_LIMIT = 3;

/**
 * 악세사리.
 *   slot  : ACC_SLOTS 의 key,  layer : "avatar"(아바타 악세) | "normal"(일반 악세)
 *   set   : 세트 이름 (SETS 의 key). 세트가 없으면 "없음"
 *   atma  : 연화세계 정령왕 아트마 악세 (ATMA 참고). 이름의 OO 는 고른 속성.
 *           게임 이름은 등급에 따라 앞말이 다르다 (장엄한 = 레전드리, 찬란한 = 유니크, 정제된 = 엘리트). 시트에는 대표 이름 하나만 있다
 */
export const ACCESSORIES = [
  { name: "엘리아노드 웨폰가드", slot: "weapon", layer: "normal", set: "없음", stats: {} },
  { name: "강인한 투사의 크로니클", slot: "weapon", layer: "normal", set: "없음", stats: { crit: 0.01, extra_dmg: 0.01 } },
  { name: "화마의 인장", slot: "weapon", layer: "normal", set: "바니미르 레이드 세트", stats: { all_skill: 0.1 } },
  { name: "암귀의 문장", slot: "weapon", layer: "normal", set: "심연 레이드 세트", stats: { all_skill: 0.15 } },
  { name: "Type-Q 여왕의 훈장", slot: "weapon", layer: "normal", set: "공중요새의 유산", stats: { all_skill: 0.18 } },
  { name: "엘리오스 수호 기사단 웨폰가드", slot: "weapon", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, maxi: 0.02, adapt: 0.02 } },
  { name: "그란디플로라 : 만개한 브로치", slot: "weapon", layer: "avatar", set: "그란디플로라 무악", stats: { patk: 30, matk: 30, crit: 0.02, polar: 0.02, adapt: 0.02 } },
  { name: "베리타스 페르소나 : 교도의 로자리오", slot: "weapon", layer: "avatar", set: "베리타스 페르소나 무악", stats: { patk: 50, matk: 50, adapt: 0.02, add: 0.03 } },
  { name: "창해유주 : 정의의 증명", slot: "support", layer: "avatar", set: "창해유주 무악", stats: { patk: 40, matk: 40, crit: 0.02, maxi: 0.03 } },
  { name: "에이전트 누스 : Type - 시커", slot: "support", layer: "avatar", set: "에이전트 누스 무악", stats: { patk: 30, matk: 30, crit: 0.03 } },
  { name: "어둠의 군상 : 군주의 감시자", slot: "support", layer: "avatar", set: "어둠의 군상 무악", stats: { patk: 35, matk: 35, crit: 0.02 } },
  { name: "플로스 마지카 : 마지카 리브리", slot: "support", layer: "avatar", set: "플로스 마지카 무악", stats: { patk: 20, matk: 20, aspd: 0.04 } },
  { name: "녹스 웨나토르 : 악령 감옥", slot: "support", layer: "avatar", set: "녹스 웨나토르 무악", stats: { patk: 30, matk: 30 } },
  { name: "엘리오스 수호 기사단 부유석", slot: "support", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, crit: 0.02, maxi: 0.02 } },
  { name: "에레보스 엘레지 : 혼의 인도령", slot: "support", layer: "avatar", set: "에레보스 엘레지 무악", stats: { patk: 30, matk: 30, maxi: 0.01, add: 0.02 } },
  { name: "그란디플로라 : 환희의 샹들리에", slot: "support", layer: "avatar", set: "그란디플로라 무악", stats: { patk: 30, matk: 30, polar: 0.02, cdr_all: 0.05 } },
  { name: "팬텀 베일 : 뱃사람의 나침반", slot: "support", layer: "avatar", set: "팬텀 베일 무악", stats: { patk: 30, matk: 30, polar: 0.02, adapt: 0.02 } },
  { name: "휴대용 에너지 코일", slot: "support", layer: "normal", set: "없음", stats: { crit_dmg: 0.03, adapt: 0.02 } },
  { name: "마족의 눈", slot: "support", layer: "normal", set: "바니미르 레이드 세트", stats: { crit_dmg: 0.05 } },
  { name: "플레가스의 형상", slot: "support", layer: "normal", set: "없음", stats: { adapt: 0.05 } },
  { name: "기계 인형 헤드", slot: "support", layer: "normal", set: "없음", stats: { maxi: 0.1, adapt: 0.02 } },
  { name: "둥실둥실 베티", slot: "support", layer: "normal", set: "없음", stats: { adapt: 0.02 } },
  { name: "몽연향로", slot: "support", layer: "normal", set: "심연 레이드 세트", stats: { adapt: 0.03 } },
  { name: "운명의 예언서", slot: "support", layer: "normal", set: "공중요새의 유산", stats: { crit_dmg: 0.05, adapt: 0.03 } },
  { name: "세크리드 나이츠 : 지고한 정의", slot: "face_top", layer: "avatar", set: "세크리드 나이츠 무악", stats: { patk: 30, matk: 30, aspd: 0.04 } },
  { name: "원더 메르헨 : 몽환의 뿔", slot: "face_top", layer: "avatar", set: "원더 메르헨 무악", stats: { patk: 30, matk: 30, aspd: 0.04 } },
  { name: "비룡승운 : 항룡의 증표", slot: "face_top", layer: "avatar", set: "비룡승운 무악", stats: { patk: 30, matk: 30 } },
  { name: "심연의 존재 : 심연의 인도", slot: "face_top", layer: "avatar", set: "심연의 존재 무악", stats: { patk: 30, matk: 30, maxi: 0.02, polar: 0.01 } },
  { name: "엘리오스 수호 기사단 헤어핀", slot: "face_top", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, crit: 0.03, aspd: 0.01 } },
  { name: "에레보스 엘레지 : 사자의 관", slot: "face_top", layer: "avatar", set: "에레보스 엘레지 무악", stats: { patk: 30, matk: 30, maxi: 0.02, polar: 0.01 } },
  { name: "아리에스 에이트라 : 솜니움 캐처", slot: "face_top", layer: "avatar", set: "아리에스 에이트라 무악", stats: { patk: 30, matk: 30, all_skill: 0.01, add: 0.01 } },
  { name: "팬텀 베일 : 선장의 트리코른", slot: "face_top", layer: "avatar", set: "팬텀 베일 무악", stats: { patk: 30, matk: 30, add: 0.02 } },
  { name: "마목의 면류관", slot: "face_top", layer: "normal", set: "없음", stats: { patk_pct: -0.05, matk_pct: -0.05, final: 0.1 } },
  { name: "침식된 가시뿔", slot: "face_top", layer: "normal", set: "없음", stats: { aspd: 0.03, adapt: 0.03, final: 0.1536 } },
  { name: "마에스트로 헤일로", slot: "face_top", layer: "normal", set: "없음", stats: { adapt: 0.02, cd_mult: 0.02, final: 0.1025 } },
  { name: "혼의 왕관", slot: "face_top", layer: "normal", set: "없음", stats: { adapt: 0.02, final: 0.05 } },
  { name: "어둠의 기운이 담긴 헤일로", slot: "face_top", layer: "normal", set: "마스터로드 세트", stats: { crit_dmg: 0.005, all_skill: 0.005 } },
  { name: "타마칸의 인장", slot: "face_top", layer: "normal", set: "없음", stats: { adapt: 0.01 } },
  { name: "창해유주 : 지식의 가호", slot: "top", layer: "avatar", set: "창해유주 무악", stats: { patk: 40, matk: 40, crit: 0.04 } },
  { name: "원더 메르헨 : 심연의 거울", slot: "top", layer: "avatar", set: "원더 메르헨 무악", stats: { patk: 30, matk: 30, cdr_all: 0.05 } },
  { name: "에이전트 누스 : 과출력 건 블레이드", slot: "top", layer: "avatar", set: "에이전트 누스 무악", stats: { patk: 30, matk: 30, aspd: 0.03 } },
  { name: "세크리드 나이츠 : 기사단의 망토", slot: "top", layer: "avatar", set: "세크리드 나이츠 무악", stats: { patk: 50, matk: 50, cdr_all: 0.05 } },
  { name: "플로스 마지카 : 마지카 서큘러스", slot: "top", layer: "avatar", set: "플로스 마지카 무악", stats: { patk: 30, matk: 30, maxi: 0.03, crit_dmg: 0.01 } },
  { name: "드리밍 오토마타 : 인형의 태엽", slot: "top", layer: "avatar", set: "드리밍 오토마타 무악", stats: { patk: 30, matk: 30, crit: 0.04 } },
  { name: "녹스 웨나토르 : 파수꾼의 장총", slot: "top", layer: "avatar", set: "녹스 웨나토르 무악", stats: { patk: 40, matk: 40, maxi: 0.04 } },
  { name: "아이테르 노블리타스 : 고결한 날개", slot: "top", layer: "avatar", set: "아이테르 노블리타스 무악", stats: { patk: 30, matk: 30, crit: 0.02, cdr_all: 0.05 } },
  { name: "블러디 나이트메어 : 스테인드글라스", slot: "top", layer: "avatar", set: "블러디 나이트메어 무악", stats: { patk: 30, matk: 30, maxi: 0.02, cdr_all: 0.05 } },
  { name: "트루비용 어셈블 : 반복되는 시간", slot: "top", layer: "avatar", set: "트루비용 어셈블 무악", stats: { patk: 30, matk: 30, crit_dmg: 0.02 } },
  { name: "비룡승운 : 호걸의 긍지", slot: "top", layer: "avatar", set: "비룡승운 무악", stats: { patk: 30, matk: 30, crit: 0.02, all_skill: 0.02 } },
  { name: "엠파이어 레인 : 영광의 헤일로", slot: "top", layer: "avatar", set: "엠파이어 레인 무악", stats: { patk: 30, matk: 30, aspd: 0.03 } },
  { name: "비타 폰타나 : 찬미의 하프", slot: "top", layer: "avatar", set: "비타 폰타나 무악", stats: { patk: 30, matk: 30, all_skill: 0.01, adapt: 0.01 } },
  { name: "엘리오스 수호 기사단 휘장", slot: "top", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, maxi: 0.03, aspd: 0.01 } },
  { name: "맹호기담 : 범의 외투", slot: "top", layer: "avatar", set: "맹호기담 무악", stats: { patk: 30, matk: 30, all_skill: 0.01, add: 0.01 } },
  { name: "그란디플로라 : 요정의 날개", slot: "top", layer: "avatar", set: "그란디플로라 무악", stats: { patk: 50, matk: 50, polar: 0.01, add: 0.01 } },
  { name: "화랑연가 : 화랑의 날개옷", slot: "top", layer: "avatar", set: "화랑연가 무악", stats: { patk: 50, matk: 50, add: 0.02 } },
  { name: "팬텀 베일 : 길잡이의 외투", slot: "top", layer: "avatar", set: "팬텀 베일 무악", stats: { patk: 30, matk: 30, adapt: 0.02 } },
  { name: "드라바키의 날개", slot: "top", layer: "normal", set: "없음", stats: {} },
  { name: "강배 스위칭", slot: "top", layer: "normal", set: "없음", stats: { hp_over: 0.1, hp_under: 0.1 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 니르바나(레전드리, 100강배)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { adapt: 0.03, add: 0.06, hp100: 0.1 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 아트마(레전드리, 강배x)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { add: 0.06 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 니르바나(유니크, 100강배)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { adapt: 0.02, add: 0.05, hp100: 0.1 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 아트마(유니크, 강배x)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { add: 0.05 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 니르바나(엘리트, 100강배)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { adapt: 0.02, add: 0.04, hp100: 0.1 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 아트마(엘리트, 강배x)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { add: 0.04 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 니르바나(레어, 100강배)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { adapt: 0.02, add: 0.03, hp100: 0.1 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 아트마(레어, 강배x)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { add: 0.03 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 니르바나(일반, 100강배)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { adapt: 0.02, add: 0.02, hp100: 0.1 } },
  { name: "장엄한 연화세계 정령왕의 만다라 - OO의 아트마(일반, 강배x)", slot: "top", layer: "normal", set: "연화세계 정령왕", atma: true, stats: { add: 0.02 } },
  { name: "창해유주 : 진리의 편린", slot: "bottom", layer: "avatar", set: "창해유주 무악", stats: { patk: 40, matk: 40, maxi: 0.04 } },
  { name: "세크리드 나이츠 : 신성한 가호", slot: "bottom", layer: "avatar", set: "세크리드 나이츠 무악", stats: { patk: 50, matk: 50, crit: 0.04 } },
  { name: "드리밍 오토마타 : 돌아가는 샤프트", slot: "bottom", layer: "avatar", set: "드리밍 오토마타 무악", stats: { patk: 30, matk: 30, maxi: 0.04 } },
  { name: "아이테르 노블리타스 : 푸른 용의 숨결", slot: "bottom", layer: "avatar", set: "아이테르 노블리타스 무악", stats: { patk: 30, matk: 30 } },
  { name: "트루비용 어셈블 : 시간의 흐름", slot: "bottom", layer: "avatar", set: "트루비용 어셈블 무악", stats: { patk: 20, matk: 20, crit: 0.02, aspd: 0.02 } },
  { name: "엠파이어 레인 : 예식용 검", slot: "bottom", layer: "avatar", set: "엠파이어 레인 무악", stats: { patk: 30, matk: 30, crit_dmg: 0.02 } },
  { name: "비타 폰타나 : 길조의 시", slot: "bottom", layer: "avatar", set: "비타 폰타나 무악", stats: { patk: 30, matk: 30, crit_dmg: 0.01, adapt: 0.01 } },
  { name: "엘리오스 수호 기사단 가호", slot: "bottom", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, maxi: 0.03, aspd: 0.01 } },
  { name: "에레보스 엘레지 : 플레게톤", slot: "bottom", layer: "avatar", set: "에레보스 엘레지 무악", stats: { patk: 30, matk: 30, polar: 0.01, all_skill: 0.01 } },
  { name: "크레스트 드레인 : 미지의 속박", slot: "bottom", layer: "avatar", set: "크레스트 드레인 무악", stats: { patk: 30, matk: 30, all_skill: 0.01, add: 0.01 } },
  { name: "아리에스 에이트라 : 비아 락테아", slot: "bottom", layer: "avatar", set: "아리에스 에이트라 무악", stats: { patk: 50, matk: 50, polar: 0.01, add: 0.01 } },
  { name: "베리타스 페르소나 : 교도의 눈길", slot: "bottom", layer: "avatar", set: "베리타스 페르소나 무악", stats: { patk: 30, matk: 30, polar: 0.01, adapt: 0.01 } },
  { name: "전기자극 필드(=그림자의 검)", slot: "bottom", layer: "normal", set: "없음", stats: { adapt: 0.02 } },
  { name: "하르코니움 코어 필드", slot: "bottom", layer: "normal", set: "없음", stats: { aspd: 0.07, adapt: 0.02 } },
  { name: "글로잉 플라워", slot: "bottom", layer: "normal", set: "없음", stats: { crit: 0.1, adapt: 0.02 } },
  { name: "꺼지지 않는 불꽃", slot: "bottom", layer: "normal", set: "바니미르 레이드 세트", stats: { aspd: 0.05 } },
  { name: "휘도는 마장", slot: "bottom", layer: "normal", set: "심연 레이드 세트", stats: { aspd: 0.07 } },
  { name: "영혼의 족쇄", slot: "bottom", layer: "normal", set: "공중요새의 유산", stats: { aspd: 0.07, all_skill: 0.05 } },
  { name: "어둠의 군상 : 교란의 안대", slot: "face_mid", layer: "avatar", set: "어둠의 군상 무악", stats: { patk: 40, matk: 40, aspd: 0.02 } },
  { name: "세크리드 나이츠 : 반짝이는 축복", slot: "face_mid", layer: "avatar", set: "세크리드 나이츠 무악", stats: { patk: 30, matk: 30, maxi: 0.04 } },
  { name: "블러디 나이트메어 : 핏빛 눈물", slot: "face_mid", layer: "avatar", set: "블러디 나이트메어 무악", stats: { patk: 30, matk: 30, aspd: 0.04 } },
  { name: "비룡승운 : 영웅의 상징", slot: "face_mid", layer: "avatar", set: "비룡승운 무악", stats: { patk: 30, matk: 30, all_skill: 0.02 } },
  { name: "비타 폰타나 : 활력의 잎장식", slot: "face_mid", layer: "avatar", set: "비타 폰타나 무악", stats: { patk: 30, matk: 30, adapt: 0.01 } },
  { name: "엘리오스 수호 기사단 안대", slot: "face_mid", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, crit: 0.03, aspd: 0.01 } },
  { name: "맹호기담 : 매듭 줄 안경", slot: "face_mid", layer: "avatar", set: "맹호기담 무악", stats: { patk: 30, matk: 30, maxi: 0.01, polar: 0.02 } },
  { name: "크레스트 드레인 : 이계의 파편", slot: "face_mid", layer: "avatar", set: "크레스트 드레인 무악", stats: { patk: 30, matk: 30, add: 0.02 } },
  { name: "화랑연가 : 비련의 조협", slot: "face_mid", layer: "avatar", set: "화랑연가 무악", stats: { patk: 30, matk: 30, hp100: 0.02 } },
  { name: "동맹의 증표", slot: "face_mid", layer: "normal", set: "없음", stats: { patk_pct: 0.02, matk_pct: 0.02, aspd: -0.05, adapt: 0.02 } },
  { name: "쿠샤르타의 가면(=몽마의 날개귀)", slot: "face_mid", layer: "normal", set: "없음", stats: { adapt: 0.02 } },
  { name: "바람의 기운이 담긴 머리 장식", slot: "face_mid", layer: "normal", set: "마스터로드 세트", stats: { pdef_ign: 0.005, mdef_ign: 0.005 } },
  { name: "찬란한 연화세계 정령왕의 제삼안 - OO의 아트마", slot: "face_mid", layer: "normal", set: "연화세계 정령왕", atma: true, stats: {} },
  { name: "플로스 마지카 : 플로스 페어리", slot: "face_low", layer: "avatar", set: "플로스 마지카 무악", stats: { patk: 30, matk: 30, crit: 0.03, crit_dmg: 0.01 } },
  { name: "에이전트 누스 : 지상 작전용 방독면", slot: "face_low", layer: "avatar", set: "에이전트 누스 무악", stats: { patk: 30, matk: 30, aspd: 0.03 } },
  { name: "드리밍 오토마타 : 공허한 마음", slot: "face_low", layer: "avatar", set: "드리밍 오토마타 무악", stats: { patk: 30, matk: 30, aspd: 0.04 } },
  { name: "엘리오스 수호 기사단 광채", slot: "face_low", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, crit: 0.03, aspd: 0.01 } },
  { name: "에레보스 엘레지 : 침묵의 베일", slot: "face_low", layer: "avatar", set: "에레보스 엘레지 무악", stats: { patk: 30, matk: 30, polar: 0.01 } },
  { name: "그란디플로라 : 요정의 자취", slot: "face_low", layer: "avatar", set: "그란디플로라 무악", stats: { patk: 30, matk: 30, add: 0.02 } },
  { name: "베리타스 페르소나 : 교도의 신앙", slot: "face_low", layer: "avatar", set: "베리타스 페르소나 무악", stats: { patk: 30, matk: 30, polar: 0.02 } },
  { name: "아게이트의 파편", slot: "face_low", layer: "normal", set: "없음", stats: { pdef_ign: 0.05, mdef_ign: 0.05, adapt: 0.02 } },
  { name: "정예 글리터의 안면갑", slot: "face_low", layer: "normal", set: "없음", stats: { adapt: 0.03, final: 0.06 } },
  { name: "바리온의 털장식", slot: "face_low", layer: "normal", set: "없음", stats: { adapt: 0.02, final: 0.05 } },
  { name: "태양의 기운이 담긴 표식", slot: "face_low", layer: "normal", set: "마스터로드 세트", stats: { boss: 0.01 } },
  { name: "찬란한 연화세계 정령왕의 영락 - OO의 아트마", slot: "face_low", layer: "normal", set: "연화세계 정령왕", atma: true, stats: {} },
  { name: "어둠의 군상 : 현혹의 인장", slot: "arm", layer: "avatar", set: "어둠의 군상 무악", stats: { patk: 35, matk: 35, maxi: 0.02 } },
  { name: "원더 메르헨 : 금단의 장식", slot: "arm", layer: "avatar", set: "원더 메르헨 무악", stats: { patk: 30, matk: 30, maxi: 0.03 } },
  { name: "녹스 웨나토르 : 칠흑의 날개깃", slot: "arm", layer: "avatar", set: "녹스 웨나토르 무악", stats: { patk: 40, matk: 40, crit: 0.04 } },
  { name: "블러디 나이트메어 : 악몽의 장식", slot: "arm", layer: "avatar", set: "블러디 나이트메어 무악", stats: { patk: 30, matk: 30, all_skill: 0.02 } },
  { name: "심연의 존재 : 순환하는 어둠", slot: "arm", layer: "avatar", set: "심연의 존재 무악", stats: { patk: 30, matk: 30, polar: 0.01, all_skill: 0.01 } },
  { name: "엘리오스 수호 기사단 어깨장식", slot: "arm", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, maxi: 0.03, aspd: 0.01 } },
  { name: "크레스트 드레인 : 입자의 궤도", slot: "arm", layer: "avatar", set: "크레스트 드레인 무악", stats: { patk: 30, matk: 30, all_skill: 0.01, add: 0.01 } },
  { name: "화랑연가 : 충의의 완갑", slot: "arm", layer: "avatar", set: "화랑연가 무악", stats: { patk: 30, matk: 30, polar: 0.01, cdr_all: 0.05 } },
  { name: "물의 기운이 담긴 팔 장식", slot: "arm", layer: "normal", set: "마스터로드 세트", stats: { crit_dmg: 0.01 } },
  { name: "새로운 퀸의 팔 장식", slot: "arm", layer: "normal", set: "없음", stats: { polar: 0.01, adapt: 0.02 } },
  { name: "찬란한 연화세계 정령왕의 팔찌 - OO의 아트마", slot: "arm", layer: "normal", set: "연화세계 정령왕", atma: true, stats: {} },
  { name: "아이테르 노블리타스 : 크로스 이어커프", slot: "ear", layer: "avatar", set: "아이테르 노블리타스 무악", stats: { patk: 30, matk: 30, maxi: 0.02 } },
  { name: "원더 메르헨 : 염원의 귀걸이", slot: "ear", layer: "avatar", set: "원더 메르헨 무악", stats: { patk: 30, matk: 30, maxi: 0.03 } },
  { name: "트루비용 어셈블 : 시계추의 귀걸이", slot: "ear", layer: "avatar", set: "트루비용 어셈블 무악", stats: { patk: 30, matk: 30, aspd: 0.02, cdr_all: 0.05 } },
  { name: "엠파이어 레인 : 왕실의 기품", slot: "ear", layer: "avatar", set: "엠파이어 레인 무악", stats: { patk: 30, matk: 30, all_skill: 0.02 } },
  { name: "심연의 존재 : 신앙의 귀걸이", slot: "ear", layer: "avatar", set: "심연의 존재 무악", stats: { patk: 30, matk: 30, crit_dmg: 0.01, polar: 0.01 } },
  { name: "엘리오스 수호 기사단 귀걸이", slot: "ear", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, crit: 0.02, maxi: 0.02 } },
  { name: "맹호기담 : 옥 장식 귀걸이", slot: "ear", layer: "avatar", set: "맹호기담 무악", stats: { patk: 30, matk: 30, all_skill: 0.01, add: 0.01 } },
  { name: "아리에스 에이트라 : 넥테레 솜니아", slot: "ear", layer: "avatar", set: "아리에스 에이트라 무악", stats: { patk: 30, matk: 30, polar: 0.02 } },
  { name: "베리타스 페르소나 : 교도의 증표", slot: "ear", layer: "avatar", set: "베리타스 페르소나 무악", stats: { patk: 30, matk: 30, polar: 0.01, add: 0.02 } },
  { name: "대지의 기운이 담긴 귀걸이", slot: "ear", layer: "normal", set: "마스터로드 세트", stats: { all_skill: 0.01 } },
  { name: "군단 간부의 장식", slot: "ear", layer: "normal", set: "없음", stats: { crit_dmg: 0.03, adapt: 0.02 } },
  { name: "글리터의 훈장", slot: "ear", layer: "normal", set: "없음", stats: { crit_dmg: 0.03, adapt: 0.02, cd_mult: 0.01, final: 0.0973 } },
  { name: "안테나 이어링", slot: "ear", layer: "normal", set: "없음", stats: { crit_dmg: 0.03, adapt: 0.02, final: 0.04 } },
  { name: "드리밍 오토마타 : 인형의 브로치", slot: "neck", layer: "avatar", set: "드리밍 오토마타 무악", stats: { patk: 40, matk: 40, patk_pct: 0.01, matk_pct: 0.01, cdr_all: 0.05 } },
  { name: "블러디 나이트메어 : 어둠의 기억", slot: "neck", layer: "avatar", set: "블러디 나이트메어 무악", stats: { patk: 40, matk: 40, all_skill: 0.02, adapt: 0.02 } },
  { name: "엠파이어 레인 : 영예의 훈장", slot: "neck", layer: "avatar", set: "엠파이어 레인 무악", stats: { patk: 30, matk: 30, crit_dmg: 0.02, adapt: 0.02 } },
  { name: "비타 폰타나 : 숨결의 크라바트", slot: "neck", layer: "avatar", set: "비타 폰타나 무악", stats: { patk: 50, matk: 50, polar: 0.02, adapt: 0.02 } },
  { name: "엘리오스 수호 기사단 목걸이", slot: "neck", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, aspd: 0.02, adapt: 0.02 } },
  { name: "크레스트 드레인 : 침묵의 시선", slot: "neck", layer: "avatar", set: "크레스트 드레인 무악", stats: { patk: 50, matk: 50, adapt: 0.02, add: 0.02 } },
  { name: "화랑연가 : 인연의 매듭", slot: "neck", layer: "avatar", set: "화랑연가 무악", stats: { patk: 50, matk: 50, patk_pct: 0.02, matk_pct: 0.02, adapt: 0.02 } },
  { name: "벨더 왕국 목걸이 (힘, 지혜)", slot: "neck", layer: "normal", set: "없음", stats: { patk: 30, matk: 30, patk_pct: 0.03, matk_pct: 0.03 } },
  { name: "벨더 왕국 목걸이 (승리, 섬멸)", slot: "neck", layer: "normal", set: "없음", stats: { patk: 25, matk: 25, patk_pct: 0.03, matk_pct: 0.03, crit: 0.015, extra_dmg: 0.015 } },
  { name: "홍염의 기운이 담긴 목걸이", slot: "neck", layer: "normal", set: "마스터로드 세트", stats: { patk_pct: 0.005 } },
  { name: "나소드 컨트롤러", slot: "neck", layer: "normal", set: "마스터로드 세트", stats: { matk_pct: 0.005 } },
  { name: "찬란한 연화세계 정령왕의 목 장식 - OO의 아트마", slot: "neck", layer: "normal", set: "연화세계 정령왕", atma: true, stats: {} },
  { name: "트루비용 어셈블 반지(물공)", slot: "ring", layer: "avatar", set: "트루비용 어셈블 무악", stats: { patk: 50, matk: 50, patk_pct: 0.03, pdef_ign: 0.02 } },
  { name: "트루비용 어셈블 반지(마공)", slot: "ring", layer: "avatar", set: "트루비용 어셈블 무악", stats: { patk: 50, matk: 50, matk_pct: 0.03, mdef_ign: 0.02 } },
  { name: "심연의 존재 : 영성의 반지(마공)", slot: "ring", layer: "avatar", set: "심연의 존재 무악", stats: { patk: 50, matk: 50, matk_pct: 0.03, add: 0.02 } },
  { name: "심연의 존재 : 영락의 반지(물공)", slot: "ring", layer: "avatar", set: "심연의 존재 무악", stats: { patk: 50, matk: 50, patk_pct: 0.03, add: 0.02 } },
  { name: "엘리오스 수호 기사단 반지", slot: "ring", layer: "avatar", set: "엘리오스 수호 기사단", stats: { patk: 25, matk: 25, crit: 0.02, all_skill: 0.02 } },
  { name: "맹호기담 : 홍옥 반지(물반)", slot: "ring", layer: "avatar", set: "맹호기담 무악", stats: { patk: 50, matk: 50, patk_pct: 0.03, polar: 0.02 } },
  { name: "맹호기담 : 청옥 반지(마반)", slot: "ring", layer: "avatar", set: "맹호기담 무악", stats: { patk: 50, matk: 50, matk_pct: 0.03, polar: 0.02 } },
  { name: "아리에스 에이트라 : 프로 메모리아", slot: "ring", layer: "avatar", set: "아리에스 에이트라 무악", stats: { patk: 50, matk: 50, polar: 0.02, add: 0.03 } },
  { name: "팬텀 베일 : 선원의 유품", slot: "ring", layer: "avatar", set: "팬텀 베일 무악", stats: { patk: 50, matk: 50, hp100: 0.03, cho: 0.03, gang: 0.03, tough: 0.03, active: 0.03 } },
  { name: "거울 세계의 조각", slot: "ring", layer: "normal", set: "없음", stats: { final: 0.04 } },
  { name: "온전한 에너지 변환 장치", slot: "ring", layer: "normal", set: "없음", stats: { final: 0.03 } },
  { name: "강인한 투사의 분노 반지", slot: "ring", layer: "normal", set: "없음", stats: { patk_pct: 0.005, matk_pct: 0.005, crit: 0.01, extra_dmg: 0.01 } },
  { name: "초월한 투사의 기술 반지", slot: "ring", layer: "normal", set: "없음", stats: { patk_pct: 0.005, matk_pct: 0.005, crit: 0.01, extra_dmg: 0.01, cho: 0.2 } },
  { name: "강렬한 투사의 기술 반지", slot: "ring", layer: "normal", set: "없음", stats: { patk_pct: 0.005, matk_pct: 0.005, crit: 0.01, extra_dmg: 0.01, gang: 0.2 } },
  { name: "강인한 투사의 기술 반지", slot: "ring", layer: "normal", set: "없음", stats: { patk_pct: 0.005, matk_pct: 0.005, crit: 0.01, extra_dmg: 0.01, tough: 0.2 } },
  { name: "유연한 투사의 기술 반지", slot: "ring", layer: "normal", set: "없음", stats: { patk_pct: 0.005, matk_pct: 0.005, crit: 0.01, extra_dmg: 0.01, active: 0.2 } },
];

/**
 * 게임에는 있지만 시트(2.21.4)에 없는 악세. 장비 리포트로 확인했다.
 * 능력치를 몰라 계산에서는 아무 효과도 없는 것으로 본다 (unknown: true). 수치를 알게 되면 ACCESSORIES 로 옮긴다.
 */
export const NEW_ACCESSORIES = [
  { name: "칠계의 권능 : 권위의 축원", slot: "face_low", layer: "avatar", set: "없음", unknown: true, stats: {} },
  { name: "엘피어스의 킨더", slot: "support", layer: "avatar", set: "없음", unknown: true, stats: {} },
  { name: "투명 액세서리 (무기)", slot: "weapon", layer: "avatar", set: "없음", stats: {} },   // 원래 능력치가 없는 꾸밈용
  { name: "오리하르콘 그라비티 컨트롤", slot: "weapon", layer: "normal", set: "없음", unknown: true, stats: {} },
  { name: "침식된 엘리아노드 웨폰 가드", slot: "weapon", layer: "normal", set: "없음", unknown: true, stats: {} },
  { name: "답이 보이는 안경", slot: "face_mid", layer: "normal", set: "없음", unknown: true, stats: {} },
  { name: "마기에 물든 공간 관리자의 문양", slot: "face_low", layer: "normal", set: "없음", unknown: true, stats: {} },
  { name: "침식된 엘리아노드 귀걸이", slot: "ear", layer: "normal", set: "없음", unknown: true, stats: {} },
  { name: "아이스 퀸", slot: "arm", layer: "normal", set: "없음", unknown: true, stats: {} },
];

/** 시트에 없는 레어 아바타 세트 (수치를 모른다) */
export const NEW_ARMOR_SETS = ["칠계의 권능"];

/** 무기 아바타. 같은 이름의 무악 세트 개수에 들어간다 */
export const WEAPON_AVATARS = [
  { name: "창해유주 무기", set: "창해유주 무악", stats: { patk: 200, matk: 200, crit: 0.03, polar: 0.03 } },
  { name: "원더 메르헨 무기", set: "원더 메르헨 무악", stats: { patk: 200, matk: 200, pdef_ign: 0.03, mdef_ign: 0.03 } },
  { name: "에이전트 누스 무기", set: "에이전트 누스 무악", stats: { patk: 200, matk: 200, all_skill: 0.05 } },
  { name: "세크리드 나이츠 무기", set: "세크리드 나이츠 무악", stats: { patk: 250, matk: 250, polar: 0.05 } },
  { name: "어둠의 군상 무기", set: "어둠의 군상 무악", stats: { patk: 200, matk: 200, pdef_ign: 0.05, mdef_ign: 0.05 } },
  { name: "플로스 마지카 무기", set: "플로스 마지카 무악", stats: { patk: 200, matk: 200, all_skill: 0.05 } },
  { name: "드리밍 오토마타 무기", set: "드리밍 오토마타 무악", stats: { patk: 230, matk: 230, polar: 0.05 } },
  { name: "녹스 웨나토르 무기", set: "녹스 웨나토르 무악", stats: { patk: 200, matk: 200, all_skill: 0.02, adapt: 0.03 } },
  { name: "아이테르 노블리타스 무기", set: "아이테르 노블리타스 무악", stats: { patk: 250, matk: 250, add: 0.05 } },
  { name: "블러디 나이트메어 무기", set: "블러디 나이트메어 무악", stats: { patk: 250, matk: 250, hp100: 0.05 } },
  { name: "트루비용 어셈블 무기", set: "트루비용 어셈블 무악", stats: { patk: 200, matk: 200, add: 0.05 } },
  { name: "비룡승운 무기", set: "비룡승운 무악", stats: { patk: 200, matk: 200, hp100: 0.05 } },
  { name: "엠파이어 레인 무기", set: "엠파이어 레인 무악", stats: { patk: 200, matk: 200, add: 0.05 } },
  { name: "심연의 존재 무기", set: "심연의 존재 무악", stats: { patk: 200, matk: 200, hp100: 0.05 } },
  { name: "비타 폰타나 무기", set: "비타 폰타나 무악", stats: { patk: 200, matk: 200, hp100: 0.05 } },
  { name: "에레보스 엘레지 무기", set: "에레보스 엘레지 무악", stats: { patk: 200, matk: 200, crit_dmg: 0.02, add: 0.05 } },
  { name: "맹호기담 무기", set: "맹호기담 무악", stats: { patk: 200, matk: 200, hp100: 0.05 } },
  { name: "크레스트 드레인 무기", set: "크레스트 드레인 무악", stats: { patk: 200, matk: 200, hp100: 0.05 } },
  { name: "그란디플로라 무기", set: "그란디플로라 무악", stats: { patk: 200, matk: 200, hp100: 0.05 } },
  { name: "아리에스 에이트라 무기", set: "아리에스 에이트라 무악", stats: { patk: 200, matk: 200, hp100: 0.05 } },
  { name: "화랑연가 무기", set: "화랑연가 무악", stats: { patk: 200, matk: 200, hp100: 0.05 } },
  { name: "베리타스 페르소나 무기", set: "베리타스 페르소나 무악", stats: { patk: 200, matk: 200, hp_over: 0.05, hp_under: 0.05 } },
  { name: "팬텀 베일 무기", set: "팬텀 베일 무악", stats: { patk: 200, matk: 200, hp_over: 0.05, hp_under: 0.05 } },
];

/** 레어 아바타(헤어·상의·하의·장갑·신발) 세트별 부위 능력치. 세트 효과는 SETS 의 kind: "armor" */
export const ARMOR_AVATARS = {
  "창해유주": { hair: { patk: 30, matk: 30, maxi: 0.03 }, top: { patk: 50, matk: 50, maxi: 0.03 }, bottom: { patk: 50, matk: 50, crit: 0.03 }, gloves: { patk: 30, matk: 30, crit: 0.02, aspd: 0.02 }, shoes: { patk: 30, matk: 30, maxi: 0.02, aspd: 0.02 } },
  "원더 메르헨": { hair: { patk: 30, matk: 30, crit: 0.04 }, top: { patk: 50, matk: 50, aspd: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 30, matk: 30, crit: 0.02 }, shoes: { patk: 30, matk: 30, crit: 0.02 } },
  "에이전트 누스": { hair: { patk: 40, matk: 40, aspd: 0.03 }, top: { patk: 50, matk: 50, crit: 0.03 }, bottom: { patk: 50, matk: 50, aspd: 0.03 }, gloves: { patk: 30, matk: 30, aspd: 0.03 }, shoes: { patk: 30, matk: 30, maxi: 0.03 } },
  "세크리드 나이츠": { hair: { patk: 35, matk: 35, crit: 0.02, aspd: 0.02 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, crit: 0.04 }, gloves: { patk: 35, matk: 35, maxi: 0.04 }, shoes: { patk: 35, matk: 35, maxi: 0.04 } },
  "어둠의 군상": { hair: { patk: 30, matk: 30, crit: 0.02, maxi: 0.02, extra_dmg: 0.025 }, top: { patk: 40, matk: 40, crit: 0.03 }, bottom: { patk: 40, matk: 40, aspd: 0.03 }, gloves: { patk: 30, matk: 30, maxi: 0.02 }, shoes: { patk: 30, matk: 30, aspd: 0.03 } },
  "플로스 마지카": { hair: { patk: 30, matk: 30, crit: 0.02, maxi: 0.02 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 30, matk: 30, crit: 0.02 }, shoes: { patk: 30, matk: 30, aspd: 0.02 } },
  "드리밍 오토마타": { hair: { patk: 40, matk: 40, crit: 0.04 }, top: { patk: 50, matk: 50, maxi: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 30, matk: 30, crit: 0.02 }, shoes: { patk: 30, matk: 30, crit: 0.02 } },
  "녹스 웨나토르": { hair: { patk: 30, matk: 30, crit: 0.02, aspd: 0.02 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 30, matk: 30, crit: 0.02, aspd: 0.02 }, shoes: { patk: 30, matk: 30, maxi: 0.02, aspd: 0.02 } },
  "아이테르 노블리타스": { hair: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, crit: 0.04 }, gloves: { patk: 30, matk: 30, maxi: 0.04 }, shoes: { patk: 30, matk: 30, maxi: 0.04 } },
  "블러디 나이트메어": { hair: { patk: 40, matk: 40, crit: 0.04 }, top: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, bottom: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, gloves: { patk: 30, matk: 30, crit: 0.02, maxi: 0.02 }, shoes: { patk: 30, matk: 30, crit: 0.02, maxi: 0.02 } },
  "트루비용 어셈블": { hair: { patk: 50, matk: 50, crit: 0.04 }, top: { patk: 50, matk: 50, maxi: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 50, matk: 50, crit: 0.04 }, shoes: { patk: 50, matk: 50, crit: 0.04 } },
  "비룡승운": { hair: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, crit: 0.04 }, gloves: { patk: 50, matk: 50, maxi: 0.04 }, shoes: { patk: 50, matk: 50, maxi: 0.04 } },
  "엠파이어 레인": { hair: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, top: { patk: 50, matk: 50, maxi: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 50, matk: 50, crit: 0.04 }, shoes: { patk: 50, matk: 50, crit: 0.04 } },
  "심연의 존재": { hair: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, top: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, bottom: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, gloves: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, shoes: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 } },
  "비타 폰타나": { hair: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, crit: 0.04 }, gloves: { patk: 50, matk: 50, maxi: 0.04 }, shoes: { patk: 50, matk: 50, maxi: 0.04 } },
  "에레보스 엘레지": { hair: { patk: 50, matk: 50, crit: 0.04 }, top: { patk: 50, matk: 50, maxi: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 50, matk: 50, crit: 0.04 }, shoes: { patk: 50, matk: 50, crit: 0.04 } },
  "맹호기담": { hair: { patk: 50, matk: 50, crit: 0.04 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 50, matk: 50, crit: 0.04 }, shoes: { patk: 50, matk: 50, maxi: 0.04 } },
  "크레스트 드레인": { hair: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, top: { patk: 50, matk: 50, maxi: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 50, matk: 50, crit: 0.04 }, shoes: { patk: 50, matk: 50, crit: 0.04 } },
  "그란디플로라": { hair: { patk: 50, matk: 50, crit: 0.04 }, top: { patk: 50, matk: 50, maxi: 0.04 }, bottom: { patk: 50, matk: 50, crit: 0.04 }, gloves: { patk: 50, matk: 50, maxi: 0.04 }, shoes: { patk: 50, matk: 50, crit: 0.04 } },
  "아리에스 에이트라": { hair: { patk: 50, matk: 50, crit: 0.02, maxi: 0.02 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, crit: 0.04 }, gloves: { patk: 50, matk: 50, maxi: 0.04 }, shoes: { patk: 50, matk: 50, maxi: 0.04 } },
  "화랑연가": { hair: { patk: 50, matk: 50, crit: 0.04 }, top: { patk: 50, matk: 50, maxi: 0.04 }, bottom: { patk: 50, matk: 50, maxi: 0.04 }, gloves: { patk: 50, matk: 50, crit: 0.04 }, shoes: { patk: 50, matk: 50, crit: 0.04 } },
  "베리타스 페르소나": { hair: { patk: 50, matk: 50, crit: 0.04 }, top: { patk: 50, matk: 50, crit: 0.04 }, bottom: { patk: 50, matk: 50, crit: 0.04 }, gloves: { patk: 50, matk: 50, maxi: 0.04 }, shoes: { patk: 50, matk: 50, maxi: 0.04 } },
  "팬텀 베일": { hair: { patk: 50, matk: 50, crit: 0.05 }, top: { patk: 50, matk: 50, crit: 0.025, maxi: 0.025 }, bottom: { patk: 50, matk: 50, crit: 0.025, maxi: 0.025 }, gloves: { patk: 50, matk: 50, maxi: 0.04 }, shoes: { patk: 50, matk: 50, crit: 0.04 } },
};

/** 한벌 아바타 (레어 아바타 대신 입는 한 벌짜리) */
export const OUTFITS = [
  { name: "공존의 축제 예복", stats: { patk: 20, matk: 20, patk_pct: 0.01, matk_pct: 0.01, crit: 0.01 } },
  { name: "엘리오스의 고귀한 결투사 예복", stats: { patk: 40, matk: 40, all_skill: 0.01 } },
  { name: "공존의 축제 엘리아노드 의상", stats: { patk: 20, matk: 20, maxi: 0.03, all_skill: 0.02 } },
  { name: "스포티 메이드", stats: { patk: 30, matk: 30, crit: 0.03, all_skill: 0.02 } },
  { name: "베스마풍 공존의 축제 의상", stats: { patk: 25, matk: 25, maxi: 0.03, aspd: 0.03, add: 0.02 } },
  { name: "모험가 성장 부스팅 투명 아바타", stats: { patk: 30, matk: 30, crit: 0.05, maxi: 0.05, aspd: 0.05, all_skill: 0.04 } },
  { name: "천하일미 덤플링 서번트 의상", stats: { patk: 25, matk: 25, crit: 0.03, polar: 0.03 } },
  { name: "동방미식 덤플링 서번트 의상", stats: { patk: 25, matk: 25, maxi: 0.03, adapt: 0.03 } },
];

/**
 * 세트 효과. stages[n] = n개를 꼈을 때 더해지는 효과 (단계별로 따로 더한다. 4세트면 2세트 효과도 같이 켜진다)
 *   kind : "avatar" 아바타 악세(무악) 세트 - 무기 아바타도 개수에 들어가고, 동시에 AVATAR_SET_LIMIT 개까지만 켜진다
 *          "armor"  레어 아바타 세트 (헤어·상의·하의·장갑·신발)
 *          "other"  일반 악세 세트 (레이드 세트 등)
 */
export const SETS = {
  "창해유주": { kind: "armor", stages: { 2: { maxi: 0.04, adapt: 0.02 }, 4: { patk_pct: 0.04, matk_pct: 0.04, maxi: 0.03 }, 5: { polar: 0.04 } } },
  "원더 메르헨": { kind: "armor", stages: { 2: { crit: 0.05 }, 4: { all_skill: 0.03 }, 5: { polar: 0.07 } } },
  "에이전트 누스": { kind: "armor", stages: { 4: { crit: 0.1 }, 5: { all_skill: 0.1 } } },
  "세크리드 나이츠": { kind: "armor", stages: { 2: { polar: 0.02 }, 4: { crit: 0.07, all_skill: 0.04 }, 5: { adapt: 0.05 } } },
  "어둠의 군상": { kind: "armor", stages: { 2: { crit: 0.05, maxi: 0.05 }, 4: { crit_dmg: 0.06 }, 5: { patk_pct: 0.05, matk_pct: 0.05 } } },
  "플로스 마지카": { kind: "armor", stages: { 2: { maxi: 0.05 }, 4: { crit_dmg: 0.08 }, 5: { polar: 0.05 } } },
  "드리밍 오토마타": { kind: "armor", stages: { 2: { crit: 0.03, add: 0.02 }, 4: { maxi: 0.05, adapt: 0.03 }, 5: { polar: 0.05 } } },
  "녹스 웨나토르": { kind: "armor", stages: { 2: { maxi: 0.02, polar: 0.03 }, 4: { crit: 0.05, polar: 0.05 } } },
  "아이테르 노블리타스": { kind: "armor", stages: { 2: { aspd: 0.05 }, 4: { crit: 0.03, polar: 0.05 }, 5: { add: 0.05 } } },
  "블러디 나이트메어": { kind: "armor", stages: { 2: { maxi: 0.08, polar: 0.02 }, 4: { add: 0.05 }, 5: { hp_over: 0.08 } } },
  "트루비용 어셈블": { kind: "armor", stages: { 2: { crit: 0.04, crit_dmg: 0.04 }, 4: { maxi: 0.04, polar: 0.05 }, 5: { hp_under: 0.08 } } },
  "비룡승운": { kind: "armor", stages: { 2: { crit: 0.03, all_skill: 0.02 }, 4: { maxi: 0.03, polar: 0.03 }, 5: { add: 0.08 } } },
  "엠파이어 레인": { kind: "armor", stages: { 2: { crit: 0.04, maxi: 0.04 }, 4: { polar: 0.05 }, 5: { all_skill: 0.08 } } },
  "심연의 존재": { kind: "armor", stages: { 2: { crit: 0.1 }, 4: { adapt: 0.05 }, 5: { add: 0.1 } } },
  "비타 폰타나": { kind: "armor", stages: { 2: { maxi: 0.1 }, 4: { add: 0.08 }, 5: { hp100: 0.06 } } },
  "에레보스 엘레지": { kind: "armor", stages: { 2: { crit: 0.05, maxi: 0.05 }, 4: { add: 0.05 }, 5: { polar: 0.05, adapt: 0.05 } } },
  "맹호기담": { kind: "armor", stages: { 2: { crit_dmg: 0.08 }, 4: { add: 0.05, hp100: 0.04 }, 5: { adapt: 0.05 } } },
  "크레스트 드레인": { kind: "armor", stages: { 2: { crit: 0.1 }, 4: { polar: 0.09 }, 5: { hp100: 0.06 } } },
  "그란디플로라": { kind: "armor", stages: { 2: { crit: 0.05, maxi: 0.05 }, 4: { hp_over: 0.05, hp_under: 0.05 }, 5: { add: 0.1 } } },
  "아리에스 에이트라": { kind: "armor", stages: { 2: { maxi: 0.1 }, 4: { polar: 0.02, add: 0.03 }, 5: { hp100: 0.1 } } },
  "화랑연가": { kind: "armor", stages: { 2: { crit: 0.05, maxi: 0.05 }, 4: { polar: 0.02, add: 0.03 }, 5: { hp_over: 0.1, hp_under: 0.1 } } },
  "베리타스 페르소나": { kind: "armor", stages: { 2: { crit: 0.08, polar: 0.05 }, 4: { add: 0.05 }, 5: { hp100: 0.1 } } },
  "팬텀 베일": { kind: "armor", stages: { 2: { maxi: 0.06 }, 4: { polar: 0.1 }, 5: { hp_over: 0.1, hp_under: 0.1 } } },
  "창해유주 무악": { kind: "avatar", stages: { 2: { adapt: 0.03 }, 3: { all_skill: 0.08, cdr_all: 0.03 } } },
  "원더 메르헨 무악": { kind: "avatar", stages: { 2: { maxi: 0.05, polar: 0.05 }, 3: { patk_pct: 0.03, matk_pct: 0.03, all_skill: 0.02 } } },
  "에이전트 누스 무악": { kind: "avatar", stages: { 2: { boss: 0.1 }, 3: { maxi: 0.08, all_skill: 0.05 } } },
  "세크리드 나이츠 무악": { kind: "avatar", stages: { 2: { all_skill: 0.03 }, 3: { polar: 0.05, all_skill: 0.02 } } },
  "어둠의 군상 무악": { kind: "avatar", stages: { 2: { crit_dmg: 0.02 }, 3: { all_skill: 0.1 } } },
  "플로스 마지카 무악": { kind: "avatar", stages: { 2: { patk_pct: 0.03, matk_pct: 0.03, crit_dmg: 0.02 }, 3: { maxi: 0.05, polar: 0.05 } } },
  "드리밍 오토마타 무악": { kind: "avatar", stages: { 2: { crit: 0.05, polar: 0.03 }, 3: { all_skill: 0.02, add: 0.05 } } },
  "녹스 웨나토르 무악": { kind: "avatar", stages: { 2: { adapt: 0.03 }, 3: { patk_pct: 0.05, matk_pct: 0.05, maxi: 0.05, all_skill: 0.02 } } },
  "아이테르 노블리타스 무악": { kind: "avatar", stages: { 2: { maxi: 0.05, adapt: 0.05 }, 3: { all_skill: 0.03, add: 0.03 } } },
  "블러디 나이트메어 무악": { kind: "avatar", stages: { 2: { crit: 0.02, polar: 0.05 }, 3: { add: 0.05 } } },
  "트루비용 어셈블 무악": { kind: "avatar", stages: { 2: { add: 0.05 }, 3: { adapt: 0.02, hp100: 0.03 } } },
  "비룡승운 무악": { kind: "avatar", stages: { 2: { cdr_all: 0.05, add: 0.03 }, 3: { polar: 0.07 } } },
  "엠파이어 레인 무악": { kind: "avatar", stages: { 2: { hp100: 0.05 }, 3: { all_skill: 0.08, cd_mult: 0.01 } } },
  "심연의 존재 무악": { kind: "avatar", stages: { 2: { add: 0.05 }, 3: { patk_pct: 0.07, matk_pct: 0.07, cdr_all: 0.05 } } },
  "비타 폰타나 무악": { kind: "avatar", stages: { 2: { polar: 0.05, cdr_all: 0.05 }, 3: { add: 0.07 } } },
  "에레보스 엘레지 무악": { kind: "avatar", stages: { 2: { hp100: 0.05 }, 3: { crit_dmg: 0.02, add: 0.07 } } },
  "엘리오스 수호 기사단": { kind: "avatar", stages: { 3: { all_skill: 0.05, cdr_all: 0.05 }, 4: { aspd: 0.1, adapt: 0.05 } } },
  "맹호기담 무악": { kind: "avatar", stages: { 2: { polar: 0.04, cho: 0.04, gang: 0.04 }, 3: { hp100: 0.06 } } },
  "크레스트 드레인 무악": { kind: "avatar", stages: { 2: { all_skill: 0.02, hp100: 0.04 }, 3: { patk_pct: 0.06, matk_pct: 0.06, adapt: 0.02 } } },
  "그란디플로라 무악": { kind: "avatar", stages: { 2: { hp_over: 0.05, hp_under: 0.05 }, 3: { all_skill: 0.05, add: 0.06 } } },
  "아리에스 에이트라 무악": { kind: "avatar", stages: { 2: { crit_dmg: 0.03, hp100: 0.04 }, 3: { all_skill: 0.03, hp_over: 0.06, hp_under: 0.06 } } },
  "화랑연가 무악": { kind: "avatar", stages: { 2: { add: 0.05 }, 3: { all_skill: 0.05, hp100: 0.06 } } },
  "베리타스 페르소나 무악": { kind: "avatar", stages: { 2: { polar: 0.03, add: 0.03 }, 3: { hp_over: 0.1, hp_under: 0.1, cho: 0.04, gang: 0.04 } } },
  "팬텀 베일 무악": { kind: "avatar", stages: { 2: { add: 0.1 }, 3: { cdr_all: 0.05, hp100: 0.1 } } },
  "바니미르 레이드 세트": { kind: "other", stages: { 2: { boss: 0.05 }, 3: { polar: 0.05 } } },
  "심연 레이드 세트": { kind: "other", stages: { 2: { boss: 0.05 }, 3: { polar: 0.03, add: 0.03 } } },
  "공중요새의 유산": { kind: "other", stages: { 2: { crit: 0.05, boss: 0.07 }, 3: { polar: 0.05, add: 0.05 } } },
  "마스터로드 세트": { kind: "other", stages: { 2: { patk_pct: 0.03, matk_pct: 0.03, adapt: 0.01 }, 3: { polar: 0.03, adapt: 0.02 } } },
};

/**
 * 연화세계 정령왕 아트마 악세 세트.
 *   pieces : 아트마 악세가 들어가는 부위 (일반 악세). 이 중 need 개 이상 껴야 세트 효과가 켜진다
 *   등급   : 위 등급부터 세어서 need 개가 처음 채워지는 등급이 세트 등급이다 (예: 유니크 3 + 엘리트 2 -> 엘리트)
 *            세트 효과는 유니크가 최고라, 레전드리 악세는 유니크로 센다 (maxGrade). 레전드리는 상의(만다라)에만 있다
 *   sets   : 속성별 효과. 등급별 값은 시트 <교체 정보>의 악세 등급표
 * 바람의 아트마는 실제로 거의 쓰지 않아서 넣지 않았다.
 */
export const ATMA = {
  pieces: ["face_mid", "face_low", "arm", "neck", "top"],
  elements: ["유수", "초목", "화염", "어둠", "대지", "바람"],
  /** 게임 이름 앞말 -> 등급 */
  gradeWords: { 장엄한: "레전드리", 찬란한: "유니크", 정제된: "엘리트" },
  need: 4,
  grades: ["레전드리", "유니크", "엘리트", "레어", "일반"],
  maxGrade: "유니크",
  sets: {
    "화염의 아트마": { final: { 유니크: 0.20, 엘리트: 0.16, 레어: 0.13, 일반: 0.10 } },
    "어둠의 아트마": { final: { 유니크: 0.25, 엘리트: 0.21, 레어: 0.18, 일반: 0.15 } },
    "대지의 아트마": { final: { 유니크: 0.20, 엘리트: 0.16, 레어: 0.13, 일반: 0.10 } },
    "초목의 아트마": { cd_mult: { 유니크: 0.30, 엘리트: 0.26, 레어: 0.23, 일반: 0.20 }, fixed: { crit: -0.06 } },
    "유수의 아트마": { final: { 유니크: 0.20, 엘리트: 0.16, 레어: 0.13, 일반: 0.10 } },
  },
};
