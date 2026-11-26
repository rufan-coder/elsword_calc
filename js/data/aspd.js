// 전직별 동작 속도 패시브·버프. 사용자가 정리한 표("엘소드 동작속도 패시브/버프 데이터", 2026.11) 그대로.
// DPS에는 넣지 않고 실전 수치의 동작 속도에만 쓴다. 계산식은 js/data/buffs.js 의 ASPD 참고.
//
// 한 줄: { classes: 적용 전직, name: 스킬 이름, v: 수치(0.10 = 10%), kind, dur: 유지, note: 비고, toggle, defaultOn, guess }
//   kind      : "mult" 곱연산 (칭호·격려와 같이 곱해서 x1.4까지)
//               "dim"  점감 합연 (스탯창 동속에 더해서 점감을 같이 받고 30%까지)
//               "flat" 무점감 (70% 천장 뒤에 그대로 더함)
//   toggle    : 켜고 끌 수 있는 것 (표의 "선택사항 o"). 없으면 늘 켜져 있다
//   defaultOn : 처음 켜져 있는지 (toggle 일 때). 전직 목록이면 그 전직만 켜져 있다
//   guess     : 연산 방식을 정확히 모름 (표에 "곱연일듯?"). 곱연으로 계산한다

const ELSWORD = ["나이트 엠퍼러", "룬 마스터", "임모탈", "제네시스"];
const ELESIS = ["엠파이어 소드", "플레임 로드", "블러디 퀸", "아드레스티아"];
const AIN = ["리히터", "블루헨", "헤르셔", "비고트"];
const NOAH = ["리버레이터", "셀레스티아", "닉스 피에타", "모르페우스"];
const one = name => [name];

export const ASPD_SKILLS = [
  { classes: ELSWORD, name: "검의 길 (활력의 검사)", v: 0.20, kind: "mult", dur: "상시", toggle: true, defaultOn: false, note: "\"엘소드\" 캐릭터 자체 패시브, 활력의 길 활성화 시에만 발동" },
  { classes: one("나이트 엠퍼러"), name: "(체인지)아마겟돈", v: 0.065, kind: "mult", dur: "20초" },
  { classes: one("나이트 엠퍼러"), name: "전투 준비 (승리를 향한 투지)", v: 0.10, kind: "dim", dur: "상시" },
  { classes: one("임모탈"), name: "전광석화", v: 0.06, kind: "mult", dur: "상시" },
  { classes: one("오즈 소서러"), name: "가속의 문장", v: 0.10, kind: "mult", dur: "39초" },
  { classes: one("메타모르피"), name: "에너제틱 바디", v: 0.10, kind: "mult", dur: "10초" },
  { classes: one("로드 아조트"), name: "아르케(메루스)", v: 0.05, kind: "mult", dur: "60초", note: "각성 시 발동" },
  { classes: one("로드 아조트"), name: "스파클라 바디(퀸테센스)", v: 0.05, kind: "mult", dur: "12초" },
  { classes: one("아네모스"), name: "아이레린나", v: 0.15, kind: "mult", dur: "45초" },
  { classes: one("아네모스"), name: "유연한 몸놀림", v: 0.04, kind: "mult", dur: "상시" },
  { classes: one("트와일라잇"), name: "재빠른 관찰자", v: 0.05, kind: "dim", dur: "30초", toggle: true, defaultOn: true, note: "각성 시 30초 동안" },
  { classes: one("프로피티스"), name: "포어다운", v: 0.10, kind: "dim", dur: "6초", toggle: true, defaultOn: true, note: "스킬 범위 안에서만 적용" },
  { classes: one("프로피티스"), name: "영웅을 위한 서사시", v: 0.10, kind: "dim", dur: "상시" },
  { classes: one("코드:얼티메이트"), name: "여왕의 날개", v: 0.20, kind: "dim", dur: "12초", toggle: true, defaultOn: true, note: "스페셜 액티브 사용 시 50% 확률 / 버프 시간 동안 재갱신 불가" },
  { classes: one("코드:에센시아"), name: "업그레이드 일렉트론", v: 0.10, kind: "mult", dur: "15초", note: "일렉트론 볼 사용 시" },
  { classes: one("코드:사리엘"), name: "고출력 전자회로", v: 0.10, kind: "dim", dur: "20초", toggle: true, defaultOn: true, note: "각성 시 20초 동안" },
  { classes: one("코드:사리엘"), name: "에볼루션", v: 0.10, kind: "mult", dur: "10초", toggle: true, defaultOn: true, note: "10초 지속, 내부 쿨 15초라서 상시 버프가 아님" },
  { classes: one("코드:안티테제"), name: "절체 불명의 코드", v: 0.15, kind: "mult", dur: "상시", note: "네거티브 1단계 (사실상 상시)" },
  { classes: one("코멧 크루세이더"), name: "래피드 가디언", v: 0.08, kind: "mult", dur: "12초" },
  { classes: one("코멧 크루세이더"), name: "베테랑의 기술", v: 0.08, kind: "flat", dur: "상시" },
  { classes: one("페이탈 팬텀"), name: "샤프슈터 신드롬", v: 0.18, kind: "mult", dur: "33초", toggle: true, defaultOn: true },
  { classes: one("페이탈 팬텀"), name: "난전의 기술", v: 0.10, kind: "flat", dur: "상시" },
  { classes: one("디우스 아에르"), name: "페더 크레스트", v: 0.10, kind: "mult", dur: "60초", note: "녹힐 버프" },
  { classes: one("디우스 아에르"), name: "도약", v: 0.15, kind: "mult", dur: "상시" },
  { classes: one("비천"), name: "맹호격", v: 0.10, kind: "mult", dur: "30초" },
  { classes: one("비천"), name: "용맹정진", v: 0.10, kind: "mult", dur: "30초", note: "초월 스킬 사용 시 (사실상 상시)" },
  { classes: one("비천"), name: "기의 흐름", v: 0.05, kind: "mult", dur: "상시" },
  { classes: one("일천"), name: "(체인지)제압 : 도", v: 0.10, kind: "mult", dur: "60초", note: "녹힐 버프" },
  { classes: one("일천"), name: "해방된 의지 : 양염", v: 0.08, kind: "mult", dur: "30초", note: "[은], [월묘] 스킬 사용 시 (사실상 상시)" },
  { classes: ELESIS, name: "기사도 (질풍의 기사)", v: 0.10, kind: "mult", guess: true, dur: "상시", toggle: true, defaultOn: true, note: "\"엘리시스\" 캐릭터 자체 패시브, 질풍의 기사 활성화 시에만 발동" },
  { classes: one("엠파이어 소드"), name: "순발력 향상", v: 0.05, kind: "flat", dur: "상시" },
  { classes: one("엠파이어 소드"), name: "순발력 향상 (질풍의 기사)", v: 0.03, kind: "dim", dur: "30초", note: "질풍의 기사 활성화 시 30초 (사실상 상시)" },
  { classes: one("엠파이어 소드"), name: "해방된 의지 : 그랜드 마스터", v: 0.05, kind: "dim", dur: "상시", toggle: true, defaultOn: true, note: "주변 적이 1~3개체일 경우" },
  { classes: one("엠파이어 소드"), name: "기사단장의 위엄", v: 0.15, kind: "dim", dur: "상시" },
  { classes: one("플레임 로드"), name: "내면의 불길", v: 0.10, kind: "mult", dur: "20초", toggle: true, defaultOn: true, note: "화상 / 불꽃의 낙인 / 고열 상태 적 타격 시" },
  { classes: one("블러디 퀸"), name: "해방된 의지 : 크림슨 어벤저", v: 0.05, kind: "dim", dur: "30초", note: "체력이 85% 이하일 때, 질풍의 기사 활성화 시 발동" },
  { classes: one("아드레스티아"), name: "해방된 의지 : 파트로나", v: 0.10, kind: "dim", dur: "15초", note: "[디비니스 마누스] 발동 시 (사실상 상시)" },
  { classes: one("둠 브링어"), name: "해방된 의지 : 루나틱 사이커", v: 0.06, kind: "dim", dur: "상시", toggle: true, defaultOn: true, note: "해체모드 (비각성) 시 발동" },
  { classes: one("둠 브링어"), name: "사이킥 스톰", v: 0.20, kind: "dim", dur: "30초" },
  { classes: one("둠 브링어"), name: "끓어오르는 피", v: 0.10, kind: "mult", dur: "20초", note: "커맨드/액티브 제외 타격 시 (사실상 상시)" },
  { classes: one("매드 패러독스"), name: "시간제어", v: 0.05, kind: "mult", dur: "상시" },
  { classes: one("오버마인드"), name: "이뮤니티", v: 0.10, kind: "mult", dur: "60초", note: "녹힐 버프" },
  { classes: one("이노센트"), name: "이노센트 스타터", v: 0.15, kind: "mult", dur: "15초", note: "콤비네이션 스킬 타격 시 (사실상 상시)" },
  { classes: one("데메르시오"), name: "하트리스 이드", v: 0.10, kind: "mult", dur: "60초", note: "녹힐 버프" },
  { classes: one("데메르시오"), name: "방위기제", v: 0.10, kind: "mult", dur: "상시" },
  { classes: one("템페스트 버스터"), name: "해방된 의지 : 스톰 트루퍼", v: 0.15, kind: "mult", dur: "20초", note: "오버 스트라이크 상태 시 (사실상 상시)" },
  { classes: one("블랙 매서커"), name: "블러디 액션", v: 0.12, kind: "dim", dur: "60초", note: "[출혈] 상태 적 공격 시 (1중첩 0.6%, 20중첩) (사실상 상시)" },
  { classes: one("미네르바"), name: "해방된 의지 : 프레이아", v: 0.08, kind: "flat", dur: "상시" },
  { classes: one("프라임 오퍼레이터"), name: "G-익스텐션", v: 0.10, kind: "flat", dur: "상시" },
  { classes: AIN, name: "권능:순환모드", v: 0.15, kind: "mult", guess: true, dur: "상시", toggle: true, defaultOn: true, note: "[권능: 순환모드] 상태일 때만 발동" },
  { classes: one("리히터"), name: "중재자", v: 0.10, kind: "mult", dur: "상시", toggle: true, defaultOn: true, note: "[권능: 창조마법] 상태일 때만 발동" },
  { classes: one("블루헨"), name: "선한 영향력", v: 0.10, kind: "mult", dur: "60초", note: "[에델아이트:빌레] 소모 시 발동" },
  { classes: one("헤르셔"), name: "공허의 절대자", v: 0.06, kind: "dim", dur: "상시" },
  { classes: one("비고트"), name: "격분", v: 0.15, kind: "mult", dur: "상시", note: "라우 단계 x 5% (총 15%)" },
  { classes: one("라디언트 소울"), name: "바람이 불어", v: 0.10, kind: "mult", dur: "60초", note: "녹힐 버프" },
  { classes: one("니샤 라비린스"), name: "도와줘, 니샤!", v: 0.07, kind: "flat", dur: "상시" },
  { classes: one("니샤 라비린스"), name: "이제 깰 시간이야", v: 0.10, kind: "dim", dur: "10.5초", toggle: true, defaultOn: false, note: "사실상 안 쓰는 스킬" },
  { classes: one("트윈즈 피카로"), name: "이제 힘이 나!", v: 0.14, kind: "mult", dur: "상시", note: "검은 기운 10 이상 (사실상 상시)" },
  { classes: NOAH, name: "월광 - 반월", v: 0.10, kind: "mult", guess: true, dur: "상시", toggle: true, defaultOn: ["셀레스티아"], note: "셀레스티아 외에는 쓰기 힘들어 셀레스티아만 처음 켜 둠" },
  { classes: one("리버레이터"), name: "백야", v: 0.10, kind: "mult", dur: "30초", toggle: true, defaultOn: true, note: "칠흑이 모두 쌓인 상태에서 칠흑의 달 사용 시 발동" },
  { classes: one("닉스 피에타"), name: "찬란한 달", v: 0.05, kind: "mult", dur: "60초", note: "[달의 가호] 스킬 사용 시 (사실상 상시)" },
  { classes: one("닉스 피에타"), name: "은월의 부름", v: 0.10, kind: "mult", dur: "60초", note: "녹힐 버프" },
  { classes: one("모르페우스"), name: "길을 잃은 달의 눈물", v: 0.10, kind: "dim", dur: "상시", note: "적월 각성 시 발동 (사실상 상시)" },
  { classes: one("젬블리스"), name: "해방된 의지 : 마이티 마이너", v: 0.15, kind: "mult", dur: "8초", toggle: true, defaultOn: true, note: "슬링 사용 시 발동" },
  { classes: one("애버리스"), name: "합리적인 선택", v: 0.10, kind: "mult", dur: "60초", note: "녹힐 버프 (각성 때 젬스톤 소모 시)" },
  { classes: one("애버리스"), name: "소회", v: 0.10, kind: "dim", dur: "20초", toggle: true, defaultOn: true, note: "젬스톤 소모 시 발동 (지속 시간 안에 재발동 불가)" },
  { classes: one("아클리스"), name: "미지와의 조우", v: 0.15, kind: "dim", dur: "상시", note: "각성 시 발동 (사실상 상시)" },
  { classes: one("미스치프"), name: "아르카디아 - 오프닝", v: 0.10, kind: "mult", dur: "상시", note: "아르카디아-오프닝 상태일 경우 (사실상 상시)" },
];
