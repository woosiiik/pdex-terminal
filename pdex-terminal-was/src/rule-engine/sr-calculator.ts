import type { CandleData, SupportResistanceResult } from "../types/index.js";

/**
 * VWAP = sum(typicalPrice × volume) / sum(volume)
 * typicalPrice = (high + low + close) / 3
 */
function calcVWAP(candles: CandleData[]): number {
  let sumTPV = 0;
  let sumVol = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    sumTPV += tp * c.volume;
    sumVol += c.volume;
  }
  return sumVol === 0 ? 0 : sumTPV / sumVol;
}

/**
 * Pivot Point = (H + L + C) / 3
 * R1 = 2 × PP - L
 * S1 = 2 × PP - H
 */
function calcPivot(prevDayCandle: CandleData): { pivotPoint: number; pivotR1: number; pivotS1: number } {
  const pp = (prevDayCandle.high + prevDayCandle.low + prevDayCandle.close) / 3;
  return {
    pivotPoint: pp,
    pivotR1: 2 * pp - prevDayCandle.low,
    pivotS1: 2 * pp - prevDayCandle.high,
  };
}

export function calculateSupportResistance(
  candles7d: CandleData[],
  candles30d: CandleData[],
  recentCandles: CandleData[],
): SupportResistanceResult {
  const shortTermHigh = candles7d.reduce((max, c) => Math.max(max, c.high), -Infinity);
  const shortTermLow = candles7d.reduce((min, c) => Math.min(min, c.low), Infinity);
  const midTermHigh = candles30d.reduce((max, c) => Math.max(max, c.high), -Infinity);
  const midTermLow = candles30d.reduce((min, c) => Math.min(min, c.low), Infinity);

  const vwap = calcVWAP(recentCandles);

  // Use last candle as previous day for pivot calculation
  const lastCandle = recentCandles.length > 0
    ? recentCandles[recentCandles.length - 1]
    : { high: 0, low: 0, close: 0, open: 0, volume: 0, timestamp: 0 };
  const { pivotPoint, pivotR1, pivotS1 } = calcPivot(lastCandle);

  return {
    shortTermHigh,
    shortTermLow,
    midTermHigh,
    midTermLow,
    vwap,
    pivotPoint,
    pivotR1,
    pivotS1,
  };
}
