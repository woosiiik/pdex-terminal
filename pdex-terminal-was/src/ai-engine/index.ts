import type { RuleEngineResults, AIInterpretation, FundingAnalysisResult, OIAnalysisResult, LiquidationClusterResult } from "../types/index.js";
import { callLLM } from "./llm-client.js";
import { buildPositionAnalysisPrompt, buildFundingPrompt, buildOIPrompt, buildLiquidationPrompt } from "./prompt-builder.js";

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
