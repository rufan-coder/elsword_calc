// 던전별 환경 수치.
//   debuff     : 마계 디버프. 적응력으로 막지 못한 만큼 데미지가 줄어든다
//   critResist : 크리티컬 저항. 최종 크리티컬 확률에서 그대로 빠진다
export const DUNGEONS = {
  "네블론 레이드": { debuff: 0.95, critResist: 0.30 },
  "오케스트라 홀": { debuff: 0.95, critResist: 0.30 },
  "도전 프뤼나움 레이드": { debuff: 0.90, critResist: 0.40 },
  "도전 바니미르 레이드 2던": { debuff: 0.90, critResist: 0.35 },
  "심연 레이드 4던": { debuff: 0.90, critResist: 0.30 },
  "심연 레이드 2·3던": { debuff: 0.90, critResist: 0.20 },
  "심연 레이드 1던": { debuff: 0.90, critResist: 0.10 },
  "일반 프뤼나움 레이드": { debuff: 0.80, critResist: 0 },
  "일반 바니미르 레이드": { debuff: 0.50, critResist: 0 },
  "크리저항 없는 던전": { debuff: 0, critResist: 0 },
};
