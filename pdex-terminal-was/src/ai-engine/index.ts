import type { RuleEngineResults, AIInterpretation, FundingAnalysisResult, OIAnalysisResult, LiquidationClusterResult, OrderAnalysisRuleEngineResults, OrderAnalysisAIInterpretation, StrategyAdvice, MarketCoinSummary, DiscoverRecommendation } from "../types/index.js";
import { callLLM } from "./llm-client.js";
import { buildPositionAnalysisPrompt, buildFundingPrompt, buildOIPrompt, buildLiquidationPrompt, buildOrderAnalysisPrompt, buildStrategyAdvicePrompt, buildDiscoverPrompt } from "./prompt-builder.js";

/** Claude 등이 ```json ... ``` 마크다운 블록으로 감싸서 반환할 때 JSON만 추출 */
function extractJSON(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return raw.trim();
}

export interface AIResult<T> {
  data: T;
  llmModel: string;
}

export async function interpretPositionAnalysis(
  results: RuleEngineResults,
  symbol: string,
): Promise<AIResult<AIInterpretation> | null> {
  const { system, user } = buildPositionAnalysisPrompt(results, symbol);
  const res = await callLLM(system, user);
  if (!res) return null;
  try {
    return { data: JSON.parse(extractJSON(res.text)) as AIInterpretation, llmModel: res.model };
  } catch {
    console.error("Failed to parse AI response:", res.text);
    return null;
  }
}

export async function interpretFunding(
  result: FundingAnalysisResult,
  symbol: string,
): Promise<AIResult<{ fundingInterpretation: string }> | null> {
  const { system, user } = buildFundingPrompt(result, symbol);
  const res = await callLLM(system, user);
  if (!res) return null;
  try {
    return { data: JSON.parse(extractJSON(res.text)) as { fundingInterpretation: string }, llmModel: res.model };
  } catch {
    return null;
  }
}

export async function interpretOI(
  result: OIAnalysisResult,
  symbol: string,
): Promise<AIResult<{ oiInterpretation: string }> | null> {
  const { system, user } = buildOIPrompt(result, symbol);
  const res = await callLLM(system, user);
  if (!res) return null;
  try {
    return { data: JSON.parse(extractJSON(res.text)) as { oiInterpretation: string }, llmModel: res.model };
  } catch {
    return null;
  }
}

export async function interpretLiquidation(
  result: LiquidationClusterResult,
  symbol: string,
): Promise<AIResult<{ liquidationInterpretation: string }> | null> {
  const { system, user } = buildLiquidationPrompt(result, symbol);
  const res = await callLLM(system, user);
  if (!res) return null;
  try {
    return { data: JSON.parse(extractJSON(res.text)) as { liquidationInterpretation: string }, llmModel: res.model };
  } catch {
    return null;
  }
}

export async function interpretOrderAnalysis(
  results: OrderAnalysisRuleEngineResults,
  symbol: string,
): Promise<AIResult<OrderAnalysisAIInterpretation> | null> {
  const { system, user } = buildOrderAnalysisPrompt(results, symbol);
  const res = await callLLM(system, user);
  if (!res) return null;
  try {
    return { data: JSON.parse(extractJSON(res.text)) as OrderAnalysisAIInterpretation, llmModel: res.model };
  } catch {
    console.error("Failed to parse order analysis AI response:", res.text);
    return null;
  }
}

export async function generateStrategyAdvice(
  position: { coin: string; side: string; entryPrice: number; leverage: number; size: number; marginUsed: number },
  results: RuleEngineResults,
  currentPrice: number,
  symbol: string,
): Promise<AIResult<StrategyAdvice> | null> {
  const { system, user } = buildStrategyAdvicePrompt(position, results, currentPrice, symbol);
  const res = await callLLM(system, user);
  if (!res) return null;
  try {
    return { data: JSON.parse(extractJSON(res.text)) as StrategyAdvice, llmModel: res.model };
  } catch {
    console.error("Failed to parse strategy advice response:", res.text);
    return null;
  }
}

export async function generateDiscoverRecommendations(
  marketSummary: MarketCoinSummary[],
): Promise<AIResult<DiscoverRecommendation[]> | null> {
  const { system, user } = buildDiscoverPrompt(marketSummary);
  const res = await callLLM(system, user);
  if (!res) return null;
  try {
    const parsed = JSON.parse(extractJSON(res.text));
    // json_object 모드에서는 LLM이 배열을 object로 감쌀 수 있음
    if (Array.isArray(parsed)) return { data: parsed, llmModel: res.model };
    // { recommendations: [...] } 또는 다른 키로 감싼 경우
    const values = Object.values(parsed);
    const arr = values.find((v) => Array.isArray(v));
    if (arr) return { data: arr as DiscoverRecommendation[], llmModel: res.model };
    return null;
  } catch {
    console.error("Failed to parse discover recommendations:", res.text);
    return null;
  }
}
