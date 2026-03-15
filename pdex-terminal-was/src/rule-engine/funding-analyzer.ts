import type { FundingAnalysisResult } from "../types/index.js";

type Trend = "rising" | "falling" | "stable";

function determineTrend(rates: number[]): Trend {
  if (rates.length < 2) return "stable";
  const first = rates[0];
  const last = rates[rates.length - 1];
  const diff = last - first;
  const threshold = 0.00005; // 0.005%
  if (diff > threshold) return "rising";
  if (diff < -threshold) return "falling";
  return "stable";
}

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function calcStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function analyzeFunding(
  currentRate: number,
  rateHistory30d: number[],
  rateHistory1h: number[],
  rateHistory4h: number[],
  rateHistory24h: number[],
): FundingAnalysisResult {
  const trend1h = determineTrend(rateHistory1h);
  const trend4h = determineTrend(rateHistory4h);
  const trend24h = determineTrend(rateHistory24h);

  const mean30d = calcMean(rateHistory30d);
  const stddev30d = calcStdDev(rateHistory30d, mean30d);
  const zScore = stddev30d === 0 ? 0 : (currentRate - mean30d) / stddev30d;

  let meanReversionProbability: "높음" | "보통" | "낮음";
  if (Math.abs(zScore) >= 2) {
    meanReversionProbability = "높음";
  } else if (Math.abs(zScore) >= 1) {
    meanReversionProbability = "보통";
  } else {
    meanReversionProbability = "낮음";
  }

  let extremeSignal: string | null = null;
  if (currentRate >= 0.001) {
    extremeSignal = "극단 펀딩: 롱 과밀";
  } else if (currentRate <= -0.001) {
    extremeSignal = "극단 펀딩: 숏 과밀";
  }

  return {
    currentRate,
    trend1h,
    trend4h,
    trend24h,
    zScore,
    meanReversionProbability,
    extremeSignal,
  };
}
