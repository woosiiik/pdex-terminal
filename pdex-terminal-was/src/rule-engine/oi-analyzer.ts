import type { OIAnalysisResult } from "../types/index.js";

export function analyzeOI(
  currentOI: number,
  previousOI: number,
  currentPrice: number,
  previousPrice: number,
  spikeThreshold: number = 0.05,
): OIAnalysisResult {
  const oiChangePercent = previousOI === 0 ? 0 : ((currentOI - previousOI) / previousOI) * 100;
  const priceChangePercent = previousPrice === 0 ? 0 : ((currentPrice - previousPrice) / previousPrice) * 100;

  const priceUp = priceChangePercent > 0;
  const oiUp = oiChangePercent > 0;

  let scenario: OIAnalysisResult["scenario"];
  if (priceUp && oiUp) {
    scenario = "신규 롱 진입, 추세 강화";
  } else if (priceUp && !oiUp) {
    scenario = "숏 청산, 추세 약화";
  } else if (!priceUp && oiUp) {
    scenario = "신규 숏 진입, 하락 추세 강화";
  } else {
    scenario = "롱 청산, 하락 추세 약화";
  }

  const isSpike = previousOI === 0 ? false : Math.abs(currentOI - previousOI) / previousOI >= spikeThreshold;

  return {
    currentOI,
    oiChangePercent,
    priceChangePercent,
    scenario,
    isSpike,
  };
}
