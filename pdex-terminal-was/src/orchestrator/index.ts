import { config } from "../config/index.js";
import * as mds from "../data/market-data-service.js";
import { saveAnalysisResult, saveFundingRate, saveOIData, getOIHistory } from "../data/db.js";
import type { AnalysisExtra } from "../data/db.js";
import { calculateRiskScore } from "../rule-engine/risk-calculator.js";
import { calculateSupportResistance } from "../rule-engine/sr-calculator.js";
import { analyzeFunding } from "../rule-engine/funding-analyzer.js";
import { analyzeOI } from "../rule-engine/oi-analyzer.js";
import { analyzeLiquidationClusters } from "../rule-engine/liquidation-analyzer.js";
import { interpretPositionAnalysis, interpretFunding, interpretOI, interpretLiquidation, interpretOrderAnalysis } from "../ai-engine/index.js";
import type {
  OpenPosition,
  OpenOrder,
  DataFreshness,
  PositionAnalysisResponse,
  FundingAnalysisResponse,
  OIAnalysisResponse,
  LiquidationAnalysisResponse,
  OrderAnalysisResponse,
  OrderAnalysisRuleEngineResults,
  RuleEngineResults,
} from "../types/index.js";

// ============================================================
// Timeout helper
// ============================================================

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ============================================================
// Merge freshness: if any source is cached, overall is cached
// ============================================================

function mergeFreshness(items: DataFreshness[]): DataFreshness {
  const cached = items.find((f) => f.source === "cached");
  if (cached) return { source: "cached", cachedAt: cached.cachedAt };
  return { source: "live" };
}

// ============================================================
// Position Analysis (full pipeline)
// ============================================================

export async function analyzePosition(
  positions: OpenPosition[],
  symbol: string,
  extra?: { userAddress?: string; exchange?: string },
): Promise<PositionAnalysisResponse> {
  return withTimeout(runPositionAnalysis(positions, symbol, extra), config.analysisTimeout, "Position analysis");
}

async function runPositionAnalysis(
  positions: OpenPosition[],
  symbol: string,
  extra?: { userAddress?: string; exchange?: string },
): Promise<PositionAnalysisResponse> {
  // 1. Fetch market data in parallel
  const [priceRes, candles7dRes, candles30dRes, recentCandlesRes, fundingRateRes, fundingHistRes, oiRes] =
    await Promise.all([
      mds.getPrice(symbol),
      mds.getCandles(symbol, "1h", 7),
      mds.getCandles(symbol, "4h", 30),
      mds.getCandles(symbol, "1d", 1),
      mds.getFundingRate(symbol),
      mds.getFundingHistory(symbol, 30),
      mds.getOpenInterest(symbol),
    ]);

  const freshness = mergeFreshness([
    priceRes.freshness, candles7dRes.freshness, candles30dRes.freshness,
    recentCandlesRes.freshness, fundingRateRes.freshness, fundingHistRes.freshness, oiRes.freshness,
  ]);

  const currentPrice = priceRes.data;
  const fundingRate = fundingRateRes.data;
  const fundingHistory = fundingHistRes.data;

  // Compute 24h volatility from recent candles
  const volatility24h = computeVolatility(recentCandlesRes.data, currentPrice);

  // Split funding history into time windows
  const rates30d = fundingHistory.map((e) => e.rate);
  const now = Date.now();
  const rates1h = fundingHistory.filter((e) => e.timestamp >= now - 3600_000).map((e) => e.rate);
  const rates4h = fundingHistory.filter((e) => e.timestamp >= now - 14400_000).map((e) => e.rate);
  const rates24h = fundingHistory.filter((e) => e.timestamp >= now - 86400_000).map((e) => e.rate);

  // Get previous OI from DB for comparison
  const oiHistory = await getOIHistory(symbol, 2).catch(() => []);
  const previousOI = oiHistory.length > 0 ? oiHistory[0].open_interest : oiRes.data.openInterest;
  const previousPrice = oiHistory.length > 0 ? oiHistory[0].price : currentPrice;

  // 2. Run Rule Engine modules in parallel
  const [riskScores, supportResistance, funding, openInterest, liquidation] = await Promise.all([
    Promise.resolve(
      positions.map((pos) =>
        calculateRiskScore(pos, positions, { currentPrice, volatility24h, currentFundingRate: fundingRate }),
      ),
    ),
    Promise.resolve(calculateSupportResistance(candles7dRes.data, candles30dRes.data, recentCandlesRes.data)),
    Promise.resolve(analyzeFunding(fundingRate, rates30d, rates1h, rates4h, rates24h)),
    Promise.resolve(analyzeOI(oiRes.data.openInterest, previousOI, currentPrice, previousPrice)),
    Promise.resolve(analyzeLiquidationClusters(currentPrice, positions.map((p) => ({
      priceLevel: p.liquidationPrice,
      estimatedVolume: p.size * p.entryPrice,
      side: p.side as "long" | "short",
    })))),
  ]);

  // Use first position's risk score as primary (multi-position: take highest)
  const riskScore = riskScores.reduce((best, r) => (r.totalScore > best.totalScore ? r : best), riskScores[0]);

  const ruleEngine: RuleEngineResults = { riskScore, supportResistance, funding, openInterest, liquidation };

  // 3. AI Engine interpretation (graceful degradation)
  let aiInterpretation = null;
  try {
    aiInterpretation = await interpretPositionAnalysis(ruleEngine, symbol);
  } catch {
    console.error("AI interpretation failed, returning rule engine results only");
  }

  // 4. Fire-and-forget DB save
  const matchedPos = positions.find((p) => p.coin === symbol) ?? positions[0];
  const analysisExtra: AnalysisExtra = {
    userAddress: extra?.userAddress,
    exchange: extra?.exchange ?? "hyperliquid",
    side: matchedPos?.side,
    leverage: matchedPos?.leverage,
    entryPrice: matchedPos?.entryPrice,
    markPrice: currentPrice,
  };
  saveAnalysisResult(symbol, "position", ruleEngine, aiInterpretation ? JSON.stringify(aiInterpretation) : null, analysisExtra).catch((e) =>
    console.error("DB save failed:", e),
  );
  saveFundingRate(symbol, fundingRate, new Date()).catch(() => {});
  saveOIData(symbol, oiRes.data.openInterest, currentPrice, new Date()).catch(() => {});

  return {
    success: true,
    timestamp: new Date().toISOString(),
    symbol,
    dataFreshness: freshness,
    ruleEngine,
    aiInterpretation,
  };
}

// ============================================================
// Funding Analysis (standalone)
// ============================================================

export async function analyzeFundingStandalone(symbol: string): Promise<FundingAnalysisResponse> {
  return withTimeout(runFundingAnalysis(symbol), config.analysisTimeout, "Funding analysis");
}

async function runFundingAnalysis(symbol: string): Promise<FundingAnalysisResponse> {
  const [fundingRateRes, fundingHistRes] = await Promise.all([
    mds.getFundingRate(symbol),
    mds.getFundingHistory(symbol, 30),
  ]);

  const freshness = mergeFreshness([fundingRateRes.freshness, fundingHistRes.freshness]);
  const rates30d = fundingHistRes.data.map((e) => e.rate);
  const now = Date.now();
  const rates1h = fundingHistRes.data.filter((e) => e.timestamp >= now - 3600_000).map((e) => e.rate);
  const rates4h = fundingHistRes.data.filter((e) => e.timestamp >= now - 14400_000).map((e) => e.rate);
  const rates24h = fundingHistRes.data.filter((e) => e.timestamp >= now - 86400_000).map((e) => e.rate);

  const result = analyzeFunding(fundingRateRes.data, rates30d, rates1h, rates4h, rates24h);

  let aiInterpretation = null;
  try {
    aiInterpretation = await interpretFunding(result, symbol);
  } catch {
    console.error("AI funding interpretation failed");
  }

  saveAnalysisResult(symbol, "funding", result, aiInterpretation ? JSON.stringify(aiInterpretation) : null).catch(() => {});
  saveFundingRate(symbol, fundingRateRes.data, new Date()).catch(() => {});

  return {
    success: true,
    timestamp: new Date().toISOString(),
    symbol,
    dataFreshness: freshness,
    ruleEngine: result,
    aiInterpretation,
  };
}

// ============================================================
// OI Analysis (standalone)
// ============================================================

export async function analyzeOIStandalone(symbol: string): Promise<OIAnalysisResponse> {
  return withTimeout(runOIAnalysis(symbol), config.analysisTimeout, "OI analysis");
}

async function runOIAnalysis(symbol: string): Promise<OIAnalysisResponse> {
  const [priceRes, oiRes] = await Promise.all([
    mds.getPrice(symbol),
    mds.getOpenInterest(symbol),
  ]);

  const freshness = mergeFreshness([priceRes.freshness, oiRes.freshness]);

  const oiHistory = await getOIHistory(symbol, 2).catch(() => []);
  const previousOI = oiHistory.length > 0 ? oiHistory[0].open_interest : oiRes.data.openInterest;
  const previousPrice = oiHistory.length > 0 ? oiHistory[0].price : priceRes.data;

  const result = analyzeOI(oiRes.data.openInterest, previousOI, priceRes.data, previousPrice);

  let aiInterpretation = null;
  try {
    aiInterpretation = await interpretOI(result, symbol);
  } catch {
    console.error("AI OI interpretation failed");
  }

  saveAnalysisResult(symbol, "oi", result, aiInterpretation ? JSON.stringify(aiInterpretation) : null).catch(() => {});
  saveOIData(symbol, oiRes.data.openInterest, priceRes.data, new Date()).catch(() => {});

  return {
    success: true,
    timestamp: new Date().toISOString(),
    symbol,
    dataFreshness: freshness,
    ruleEngine: result,
    aiInterpretation,
  };
}

// ============================================================
// Liquidation Analysis (standalone)
// ============================================================

export async function analyzeLiquidationStandalone(symbol: string): Promise<LiquidationAnalysisResponse> {
  return withTimeout(runLiquidationAnalysis(symbol), config.analysisTimeout, "Liquidation analysis");
}

async function runLiquidationAnalysis(symbol: string): Promise<LiquidationAnalysisResponse> {
  const priceRes = await mds.getPrice(symbol);

  const result = analyzeLiquidationClusters(priceRes.data, []); // No liquidation data source in MVP

  let aiInterpretation = null;
  try {
    aiInterpretation = await interpretLiquidation(result, symbol);
  } catch {
    console.error("AI liquidation interpretation failed");
  }

  saveAnalysisResult(symbol, "liquidation", result, aiInterpretation ? JSON.stringify(aiInterpretation) : null).catch(() => {});

  return {
    success: true,
    timestamp: new Date().toISOString(),
    symbol,
    dataFreshness: priceRes.freshness,
    ruleEngine: result,
    aiInterpretation,
  };
}

// ============================================================
// Order Analysis
// ============================================================

export async function analyzeOrder(
  orders: OpenOrder[],
  positions: OpenPosition[],
  symbol: string,
): Promise<OrderAnalysisResponse> {
  return withTimeout(runOrderAnalysis(orders, positions, symbol), config.analysisTimeout, "Order analysis");
}

async function runOrderAnalysis(
  orders: OpenOrder[],
  positions: OpenPosition[],
  symbol: string,
): Promise<OrderAnalysisResponse> {
  // 1. Fetch market data in parallel
  const [priceRes, recentCandlesRes, fundingRateRes, l2BookRes] = await Promise.all([
    mds.getPrice(symbol),
    mds.getCandles(symbol, "1d", 1),
    mds.getFundingRate(symbol),
    mds.getL2Book(symbol).catch(() => null),
  ]);

  const currentPrice = priceRes.data;
  const volatility24h = computeVolatility(recentCandlesRes.data, currentPrice);
  const fundingRate = fundingRateRes.data;

  const marketCtx: import("../types/index.js").OrderMarketContext = {
    volatility24h,
    fundingRate,
    l2Book: l2BookRes?.data ?? null,
  };

  const symbolOrders = orders.filter((o) => o.coin === symbol);

  // 2. Run Rule Engine modules in parallel with market context
  const [strategy, executionProbability, orderClusters, positionImpact] = await Promise.all([
    Promise.resolve((await import("../rule-engine/strategy-detector.js")).detectStrategy(symbolOrders, currentPrice, marketCtx)),
    Promise.resolve((await import("../rule-engine/execution-probability.js")).analyzeExecutionProbability(symbolOrders, currentPrice, marketCtx)),
    Promise.resolve((await import("../rule-engine/order-cluster-analyzer.js")).analyzeOrderClusters(symbolOrders, currentPrice)),
    Promise.resolve((await import("../rule-engine/position-impact-analyzer.js")).analyzePositionImpact(symbolOrders, positions, currentPrice)),
  ]);

  const ruleEngine: OrderAnalysisRuleEngineResults = { strategy, executionProbability, orderClusters, positionImpact };

  let aiInterpretation = null;
  try {
    aiInterpretation = await interpretOrderAnalysis(ruleEngine, symbol);
  } catch {
    console.error("AI order interpretation failed");
  }

  saveAnalysisResult(symbol, "order", ruleEngine, aiInterpretation ? JSON.stringify(aiInterpretation) : null).catch(() => {});

  return {
    success: true,
    timestamp: new Date().toISOString(),
    symbol,
    ruleEngine,
    aiInterpretation,
  };
}

// ============================================================
// Helpers
// ============================================================

function computeVolatility(candles: { high: number; low: number; close: number }[], currentPrice: number): number {
  if (candles.length === 0 || currentPrice === 0) return 0;
  // Simple ATR-like volatility as percentage
  const ranges = candles.map((c) => (c.high - c.low) / ((c.high + c.low) / 2));
  return ranges.reduce((s, r) => s + r, 0) / ranges.length;
}
