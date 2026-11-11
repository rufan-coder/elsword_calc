// 점감(체감): 크리티컬·극대화는 스탯을 쌓을수록 스탯창에 반영되는 비율이 줄어든다.
// 각 구간은 [스탯창 확률 상한, 그 구간의 반영 효율].
//   예) 크리티컬: 40%까지는 1:1, 40~68%는 0.8배, 68~86%는 0.6배, 86~100%는 0.4배

export const CRIT_BANDS = [[0.40, 1.0], [0.68, 0.8], [0.86, 0.6], [1.00, 0.4]];
export const MAXI_BANDS = [[0.40, 1.0], [0.70, 0.75], [0.90, 0.5], [1.00, 0.25]];

/** 점감 전 스탯 합 -> 스탯창 확률 */
function applyBands(stat, bands) {
  let out = 0, lo = 0;
  for (const [hi, eff] of bands) {
    const need = (hi - lo) / eff;
    if (stat <= need) return out + stat * eff;
    stat -= need; out = hi; lo = hi;
  }
  return 1;
}

/** 스탯창 확률 -> 점감 전 스탯 합 (applyBands의 역함수) */
function releaseBands(prob, bands) {
  let stat = 0, lo = 0;
  for (const [hi, eff] of bands) {
    if (prob <= hi) return stat + (prob - lo) / eff;
    stat += (hi - lo) / eff; lo = hi;
  }
  return stat;
}

export const critFromStat = stat => applyBands(stat, CRIT_BANDS);
export const statFromCrit = prob => releaseBands(prob, CRIT_BANDS);
export const maxiFromStat = stat => applyBands(stat, MAXI_BANDS);
export const statFromMaxi = prob => releaseBands(prob, MAXI_BANDS);
