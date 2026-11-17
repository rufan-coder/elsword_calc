// 던전별 환경 수치. 실질전투력 시트 ver.3.0.19의 '계산 기준·던전'(M5d) 표와 같다.
//   debuff     : 마계 디버프. 적응력으로 막지 못한 만큼 데미지가 줄어든다
//   critResist : 크리티컬 저항. 최종 크리티컬 확률에서 그대로 빠진다
// 이름은 브라우저에 저장된 입력값이 가리키는 키라서 바꾸지 않는다 (바꾸면 저장값을 못 읽는다). 새 던전은 아래에 더한다.
export const DUNGEONS = {
  "네블론 레이드": { debuff: 0.95, critResist: 0.30 },               // 글리터 보스·일반 보스 모두 같은 값
  "오케스트라 홀": { debuff: 0.95, critResist: 0.30 },               // = 둠 아포리아
  "도전 프뤼나움 레이드": { debuff: 0.90, critResist: 0.40 },
  "도전 바니미르 레이드 2던": { debuff: 0.90, critResist: 0.35 },
  "심연 레이드 4던": { debuff: 0.90, critResist: 0.30 },
  "심연 레이드 2·3던": { debuff: 0.90, critResist: 0.20 },
  "심연 레이드 1던": { debuff: 0.90, critResist: 0.10 },
  "일반 프뤼나움 레이드": { debuff: 0.80, critResist: 0 },
  "일반 바니미르 레이드": { debuff: 0.50, critResist: 0 },
  "크리저항 없는 던전": { debuff: 0, critResist: 0 },               // = 엘리아노드 (마계 없음)
  "모나테라·티르노그": { debuff: 0.90, critResist: 0 },
  "마계 디버프 95% 지역 (강철성벽)": { debuff: 0.95, critResist: 0 },
  "마계 디버프 90% 지역": { debuff: 0.90, critResist: 0 },
  "마계 디버프 80% 지역": { debuff: 0.80, critResist: 0 },
  "마계 디버프 70% 지역": { debuff: 0.70, critResist: 0 },
  "마계 디버프 60% 지역": { debuff: 0.60, critResist: 0 },
  "마계 디버프 50% 지역": { debuff: 0.50, critResist: 0 },
  "마계 디버프 40% 지역": { debuff: 0.40, critResist: 0 },
  "마계 디버프 30% 지역": { debuff: 0.30, critResist: 0 },
  "마계 디버프 20% 지역": { debuff: 0.20, critResist: 0 },
  "마계 디버프 10% 지역": { debuff: 0.10, critResist: 0 },
};
