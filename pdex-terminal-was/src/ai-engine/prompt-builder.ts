import type { RuleEngineResults, FundingAnalysisResult, OIAnalysisResult, LiquidationClusterResult, OrderAnalysisRuleEngineResults } from "../types/index.js";

const SYSTEM_PROMPT = `당신은 암호화폐 무기한 선물 거래 전문 분석가입니다.
Rule Engine이 산출한 수치 데이터를 기반으로 한국어로 간결하고 실용적인 분석 코멘트를 작성합니다.
- 각 분석 항목별로 2~3문장으로 핵심만 전달
- 구체적인 수치를 인용하여 근거 제시
- 실행 가능한 제안 포함
- 전문 용어는 최소화하되 필요시 괄호로 설명 추가`;

export function buildPositionAnalysisPrompt(results: RuleEngineResults, symbol: string): { system: string; user: string } {
  const rs = results.riskScore;
  const sr = results.supportResistance;
  const f = results.funding;
  const oi = results.openInterest;
  const liq = results.liquidation;

  const user = `${symbol} 포지션 종합 분석 데이터:

[Risk Score] 총점: ${rs.totalScore}/10
- 레버리지 리스크: ${rs.leverageRisk}/2
- 청산 리스크: ${rs.liquidationRisk}/2
- 변동성 리스크: ${rs.volatilityRisk}/2
- 펀딩 군중 리스크: ${rs.fundingCrowdRisk}/2
- 집중도 리스크: ${rs.concentrationRisk}/2

[Support/Resistance]
- 7일 고/저: ${sr.shortTermHigh} / ${sr.shortTermLow}
- 30일 고/저: ${sr.midTermHigh} / ${sr.midTermLow}
- VWAP: ${sr.vwap}, Pivot: ${sr.pivotPoint}, R1: ${sr.pivotR1}, S1: ${sr.pivotS1}

[Funding] 현재: ${f.currentRate} (1h: ${f.trend1h}, 4h: ${f.trend4h}, 24h: ${f.trend24h})
- Z-Score: ${f.zScore}, 평균회귀: ${f.meanReversionProbability}
${f.extremeSignal ? `- ⚠️ ${f.extremeSignal}` : ""}

[OI] 변화율: ${oi.oiChangePercent.toFixed(1)}%, 가격변화: ${oi.priceChangePercent.toFixed(1)}%
- 시나리오: ${oi.scenario}${oi.isSpike ? " (OI Spike 감지)" : ""}

[Liquidation] 롱 클러스터: ${liq.longClusters.length}개, 숏 클러스터: ${liq.shortClusters.length}개
${liq.nearbyWarning ? `- ⚠️ 청산 클러스터 근접 (${liq.nearbyClusterSide})` : "- 근접 클러스터 없음"}

위 데이터를 기반으로 다음 JSON 형식으로 응답해주세요:
{
  "riskInterpretation": "리스크 점수 해석",
  "srInterpretation": "지지/저항선 해석",
  "fundingInterpretation": "펀딩 레이트 해석",
  "oiInterpretation": "OI 해석",
  "liquidationInterpretation": "청산 클러스터 해석",
  "overallSummary": "종합 요약 및 제안"
}`;

  return { system: SYSTEM_PROMPT, user };
}

export function buildFundingPrompt(result: FundingAnalysisResult, symbol: string): { system: string; user: string } {
  const user = `${symbol} 펀딩 레이트 분석:
현재: ${result.currentRate}, 추세(1h/4h/24h): ${result.trend1h}/${result.trend4h}/${result.trend24h}
Z-Score: ${result.zScore}, 평균회귀: ${result.meanReversionProbability}
${result.extremeSignal ? `⚠️ ${result.extremeSignal}` : ""}

JSON 형식으로 응답: { "fundingInterpretation": "해석" }`;
  return { system: SYSTEM_PROMPT, user };
}

export function buildOIPrompt(result: OIAnalysisResult, symbol: string): { system: string; user: string } {
  const user = `${symbol} OI 분석:
OI 변화율: ${result.oiChangePercent.toFixed(1)}%, 가격변화: ${result.priceChangePercent.toFixed(1)}%
시나리오: ${result.scenario}${result.isSpike ? " (OI Spike)" : ""}

JSON 형식으로 응답: { "oiInterpretation": "해석" }`;
  return { system: SYSTEM_PROMPT, user };
}

export function buildLiquidationPrompt(result: LiquidationClusterResult, symbol: string): { system: string; user: string } {
  const user = `${symbol} Liquidation 분석:
롱 클러스터: ${JSON.stringify(result.longClusters)}
숏 클러스터: ${JSON.stringify(result.shortClusters)}
${result.nearbyWarning ? `⚠️ 근접 경고 (${result.nearbyClusterSide})` : "근접 클러스터 없음"}

JSON 형식으로 응답: { "liquidationInterpretation": "해석" }`;
  return { system: SYSTEM_PROMPT, user };
}

export function buildOrderAnalysisPrompt(results: OrderAnalysisRuleEngineResults, symbol: string): { system: string; user: string } {
  const s = results.strategy;
  const ep = results.executionProbability;
  const oc = results.orderClusters;
  const pi = results.positionImpact;

  const user = `${symbol} 오픈 오더 종합 분석 데이터:

[전략 탐지] 전략: ${s.detectedStrategy} (신뢰도: ${s.confidence})
- 설명: ${s.description}
- 주문 수: ${s.orderCount}개 (매수 ${s.buyCount}, 매도 ${s.sellCount})
- 가격 범위: $${s.priceRange.min.toLocaleString()} ~ $${s.priceRange.max.toLocaleString()}

[체결 가능성] High: ${ep.highCount}개, Medium: ${ep.mediumCount}개, Low: ${ep.lowCount}개

[주문 집중도] 클러스터: ${oc.clusters.length}개, 우세: ${oc.dominantSide}
${oc.clusters.map((c) => `- $${c.priceLevel.toLocaleString()} (${c.clusterType}, ${c.orderCount}개, ${c.distancePercent.toFixed(1)}%)`).join("\n")}

[포지션 영향] 리스크 감소: ${pi.hasRiskReduction ? "있음" : "없음"}, 리스크 증가: ${pi.hasRiskIncrease ? "있음" : "없음"}
${pi.items.map((i) => `- ${i.description} (${i.purpose})`).join("\n")}

위 데이터를 기반으로 다음 JSON 형식으로 응답해주세요:
{
  "strategyInterpretation": "전략 해석",
  "executionInterpretation": "체결 가능성 해석",
  "clusterInterpretation": "주문 집중도 해석",
  "impactInterpretation": "포지션 영향 해석",
  "overallSummary": "종합 요약 및 제안"
}`;

  return { system: SYSTEM_PROMPT, user };
}
