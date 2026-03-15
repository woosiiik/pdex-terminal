import type { OpenPosition, RiskScoreResult } from "../types/index.js";

interface MarketContext {
  currentPrice: number;
  volatility24h: number; // ATR or stddev as percentage
  currentFundingRate: number;
}

/**
 * Leverage Risk: leverage <= 3 → 0, <= 10 → 1, > 10 → 2
 */
function calcLeverageRisk(leverage: number): number {
  if (leverage <= 3) return 0;
  if (leverage <= 10) return 1;
  return 2;
}

/**
 * Liquidation Risk: distance > 20% → 0, > 10% → 1, <= 10% → 2
 */
function calcLiquidationRisk(currentPrice: number, liquidationPrice: number, side: "long" | "short"): number {
  const distance = side === "long"
    ? (currentPrice - liquidationPrice) / currentPrice
    : (liquidationPrice - currentPrice) / currentPrice;
  const pct = Math.abs(distance) * 100;
  if (pct > 20) return 0;
  if (pct > 10) return 1;
  return 2;
}

/**
 * Volatility Risk: volatility * leverage based mapping
 * volLev <= 0.5 → 0, <= 1.5 → 1, > 1.5 → 2
 */
function calcVolatilityRisk(volatility24h: number, leverage: number): number {
  const volLev = volatility24h * leverage;
  if (volLev <= 0.5) return 0;
  if (volLev <= 1.5) return 1;
  return 2;
}

/**
 * Funding Crowd Risk: if funding direction aligns with position (long + positive funding, short + negative funding)
 * |rate| < 0.01% → 0, < 0.05% → 1, >= 0.05% → 2
 */
function calcFundingCrowdRisk(side: "long" | "short", fundingRate: number): number {
  const crowded = (side === "long" && fundingRate > 0) || (side === "short" && fundingRate < 0);
  if (!crowded) return 0;
  const absRate = Math.abs(fundingRate);
  if (absRate < 0.0001) return 0;
  if (absRate < 0.0005) return 1;
  return 2;
}

/**
 * Concentration Risk: positionMargin / totalMargin
 * ratio < 30% → 0, < 60% → 1, >= 60% → 2
 */
function calcConcentrationRisk(positionMargin: number, totalMargin: number): number {
  if (totalMargin <= 0) return 0;
  const ratio = positionMargin / totalMargin;
  if (ratio < 0.3) return 0;
  if (ratio < 0.6) return 1;
  return 2;
}

export function calculateRiskScore(
  position: OpenPosition,
  allPositions: OpenPosition[],
  market: MarketContext,
): RiskScoreResult {
  const leverageRisk = calcLeverageRisk(position.leverage);
  const liquidationRisk = calcLiquidationRisk(market.currentPrice, position.liquidationPrice, position.side);
  const volatilityRisk = calcVolatilityRisk(market.volatility24h, position.leverage);
  const fundingCrowdRisk = calcFundingCrowdRisk(position.side, market.currentFundingRate);

  const totalMargin = allPositions.reduce((sum, p) => sum + p.marginUsed, 0);
  const concentrationRisk = calcConcentrationRisk(position.marginUsed, totalMargin);

  const rawSum = leverageRisk + liquidationRisk + volatilityRisk + fundingCrowdRisk + concentrationRisk;
  // Map 0~10 raw sum to 1~10 scale (min 1)
  const totalScore = Math.max(1, Math.min(10, rawSum));

  return {
    totalScore,
    leverageRisk,
    liquidationRisk,
    volatilityRisk,
    fundingCrowdRisk,
    concentrationRisk,
  };
}
