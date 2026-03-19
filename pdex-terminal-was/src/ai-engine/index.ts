import type { RuleEngineResults, AIInterpretation, FundingAnalysisResult, OIAnalysisResult, LiquidationClusterResult, OrderAnalysisRuleEngineResults, OrderAnalysisAIInterpretation, StrategyAdvice, MarketCoinSummary, DiscoverRecommendation } from "../types/index.js";
import { callLLM } from "./llm-client.js";
import { buildPositionAnalysisPrompt, buildFundingPrompt, buildOIPrompt, buildLiquidationPrompt, buildOrderAnalysisPrompt, buildStrategyAdvicePrompt, buildDiscoverPrompt } from "./prompt-builder.js";

export async function interpretPositionAnalysis(
  results: RuleEngineResults,
  symbol: string,
): Promise<AIInterpretation | null> {
  const { system, user } = buildPositionAnalysisPrompt(results, symbol);
  const raw = await callLLM(system, user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AIInterpretation;
  } catch {
    console.error("Failed to parse AI response:", raw);
    return null;
  }
}

export async function interpretFunding(
  result: FundingAnalysisResult,
  symbol: string,
): Promise<{ fundingInterpretation: string } | null> {
  const { system, user } = buildFundingPrompt(result, symbol);
  const raw = await callLLM(system, user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { fundingInterpretation: string };
  } catch {
    return null;
  }
}

export async function interpretOI(
  result: OIAnalysisResult,
  symbol: string,
): Promise<{ oiInterpretation: string } | null> {
  const { system, user } = buildOIPrompt(result, symbol);
  const raw = await callLLM(system, user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { oiInterpretation: string };
  } catch {
    return null;
  }
}

export async function interpretLiquidation(
  result: LiquidationClusterResult,
  symbol: string,
): Promise<{ liquidationInterpretation: string } | null> {
  const { system, user } = buildLiquidationPrompt(result, symbol);
  const raw = await callLLM(system, user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { liquidationInterpretation: string };
  } catch {
    return null;
  }
}

export async function interpretOrderAnalysis(
  results: OrderAnalysisRuleEngineResults,
  symbol: string,
): Promise<OrderAnalysisAIInterpretation | null> {
  const { system, user } = buildOrderAnalysisPrompt(results, symbol);
  const raw = await callLLM(system, user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OrderAnalysisAIInterpretation;
  } catch {
    console.error("Failed to parse order analysis AI response:", raw);
    return null;
  }
}

export async function generateStrategyAdvice(
  position: { coin: string; side: string; entryPrice: number; leverage: number; size: number; marginUsed: number },
  results: RuleEngineResults,
  currentPrice: number,
  symbol: string,
): Promise<StrategyAdvice | null> {
  const { system, user } = buildStrategyAdvicePrompt(position, results, currentPrice, symbol);
  const raw = await callLLM(system, user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StrategyAdvice;
  } catch {
    console.error("Failed to parse strategy advice response:", raw);
    return null;
  }
}

export async function generateDiscoverRecommendations(
  marketSummary: MarketCoinSummary[],
): Promise<DiscoverRecommendation[] | null> {
  const { system, user } = buildDiscoverPrompt(marketSummary);
  const raw = await callLLM(system, user);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // json_object 모드에서는 LLM이 배열을 object로 감쌀 수 있음
    if (Array.isArray(parsed)) return parsed;
    // { recommendations: [...] } 또는 다른 키로 감싼 경우
    const values = Object.values(parsed);
    const arr = values.find((v) => Array.isArray(v));
    if (arr) return arr as DiscoverRecommendation[];
    return null;
  } catch {
    console.error("Failed to parse discover recommendations:", raw);
    return null;
  }
}
