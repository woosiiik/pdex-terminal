import type { RuleEngineResults, FundingAnalysisResult, OIAnalysisResult, LiquidationClusterResult, OrderAnalysisRuleEngineResults, MarketCoinSummary } from "../types/index.js";

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

const STRATEGY_SYSTEM_PROMPT = `당신은 암호화폐 무기한 선물 거래 전문 전략가입니다.
사용자의 포지션 정보와 Rule Engine 분석 데이터를 기반으로 단기/중기 트레이딩 전략을 제시합니다.

규칙:
- 반드시 JSON 형식으로만 응답
- TP/SL은 구체적인 가격 숫자로 제시 (달러 기호 없이 숫자만)
- outlook은 1문장으로 현재 관점 요약
- keyLevel은 1문장으로 핵심 가격대와 그 의미
- tip은 1문장으로 실행 가능한 운용 팁
- 한국어로 작성
- 불필요한 인사말, 서론, 결론 없이 핵심만`;

export function buildStrategyAdvicePrompt(
  position: { coin: string; side: string; entryPrice: number; leverage: number; size: number; marginUsed: number },
  results: import("../types/index.js").RuleEngineResults,
  currentPrice: number,
  symbol: string,
): { system: string; user: string } {
  const sr = results.supportResistance;
  const f = results.funding;
  const oi = results.openInterest;
  const risk = results.riskScore;

  const user = `${symbol} ${position.side.toUpperCase()} 포지션 전략 요청:

[포지션 정보]
- 진입가: ${position.entryPrice}, 현재가: ${currentPrice}
- 레버리지: ${position.leverage}x, 사이즈: ${position.size}, 마진: ${position.marginUsed}
- 방향: ${position.side}
- 미실현 PnL: ${position.side === "long" ? ((currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(2) : ((position.entryPrice - currentPrice) / position.entryPrice * 100).toFixed(2)}%

[Rule Engine 분석 결과]
- 리스크 스코어: ${risk.totalScore}/10
- 7일 고/저: ${sr.shortTermHigh} / ${sr.shortTermLow}
- 30일 고/저: ${sr.midTermHigh} / ${sr.midTermLow}
- VWAP: ${sr.vwap}, Pivot R1: ${sr.pivotR1}, Pivot S1: ${sr.pivotS1}
- 펀딩: ${f.currentRate} (추세: ${f.trend1h}/${f.trend4h}/${f.trend24h}, Z-Score: ${f.zScore})
- OI: ${oi.scenario} (변화율: ${oi.oiChangePercent.toFixed(1)}%)

다음 JSON 형식으로 응답해주세요:
{
  "shortTerm": {
    "period": "1~7일",
    "tp": 숫자,
    "sl": 숫자,
    "outlook": "현재 관점 1문장",
    "keyLevel": "핵심 가격대와 의미 1문장",
    "tip": "운용 팁 1문장"
  },
  "midTerm": {
    "period": "8~21일",
    "tp": 숫자,
    "sl": 숫자,
    "outlook": "현재 관점 1문장",
    "keyLevel": "핵심 가격대와 의미 1문장",
    "tip": "운용 팁 1문장"
  }
}`;

  return { system: STRATEGY_SYSTEM_PROMPT, user };
}

const DISCOVER_SYSTEM_PROMPT = `당신은 암호화폐 단기 트레이딩 추천 전문가입니다.
Hyperliquid 전체 마켓 데이터를 분석하여 단기(1~7일) 트레이딩에 적합한 코인 3~5개를 추천합니다.

규칙:
- 반드시 JSON 배열 형식으로만 응답
- 각 추천에 coin, direction, tp, sl, confidence, reason 필드 포함
- direction은 "LONG" 또는 "SHORT"
- tp, sl은 구체적인 가격 숫자 (달러 기호 없이)
- confidence는 "high", "medium", "low" 중 하나
- reason은 한국어로 1~2문장, 추천 근거 요약
- 거래량이 충분하고 변동성이 있는 코인 우선
- 펀딩 레이트, OI 변화, 24h 변동률 등을 종합 고려
- 불필요한 인사말, 서론, 결론 없이 JSON 배열만 출력`;

export function buildDiscoverPrompt(marketSummary: MarketCoinSummary[]): { system: string; user: string } {
  // 전체 코인을 거래량 순으로 정렬하여 전달
  const sorted = [...marketSummary]
    .filter((c) => c.dayNtlVlm > 0 && c.markPx > 0)
    .sort((a, b) => b.dayNtlVlm - a.dayNtlVlm);

  const table = sorted
    .map((c) => `${c.coin} | ${c.markPx} | ${c.changePercent24h.toFixed(2)}% | ${(c.dayNtlVlm / 1e6).toFixed(1)}M | ${(c.funding * 100).toFixed(4)}% | ${(c.openInterest / 1e6).toFixed(1)}M`)
    .join("\n");

  const user = `현재 Hyperliquid 전체 ${sorted.length}개 코인 마켓 데이터:

코인 | 현재가 | 24h변동률 | 24h거래량(M USD) | 펀딩레이트(%) | OI(M USD)
${table}

위 데이터를 분석하여 단기 트레이딩에 적합한 코인 3~5개를 추천해주세요.
다음 JSON 배열 형식으로 응답해주세요:
[
  {
    "coin": "코인명",
    "direction": "LONG 또는 SHORT",
    "tp": 목표가(숫자),
    "sl": 손절가(숫자),
    "confidence": "high/medium/low",
    "reason": "추천 근거 1~2문장"
  }
]`;

  return { system: DISCOVER_SYSTEM_PROMPT, user };
}
