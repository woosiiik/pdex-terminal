// ============================================================
// Market Data Models
// ============================================================

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FundingRateEntry {
  timestamp: number;
  rate: number;
  coin: string;
}

export interface OIData {
  coin: string;
  openInterest: number;
  timestamp: number;
}

export interface MarketMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
    maxLeverage: number;
  }>;
}

// ============================================================
// Open Position
// ============================================================

export interface OpenPosition {
  coin: string;
  side: "long" | "short";
  entryPrice: number;
  size: number;
  leverage: number;
  liquidationPrice: number;
  marginUsed: number;
}

// ============================================================
// Rule Engine Result Types
// ============================================================

export interface RiskScoreResult {
  totalScore: number;        // 1~10
  leverageRisk: number;      // 0~2
  liquidationRisk: number;   // 0~2
  volatilityRisk: number;    // 0~2
  fundingCrowdRisk: number;  // 0~2
  concentrationRisk: number; // 0~2
}

export interface SupportResistanceResult {
  shortTermHigh: number;   // 7일 고가
  shortTermLow: number;    // 7일 저가
  midTermHigh: number;     // 30일 고가
  midTermLow: number;      // 30일 저가
  vwap: number;            // VWAP
  pivotPoint: number;      // Pivot Point
  pivotR1: number;         // Resistance 1
  pivotS1: number;         // Support 1
}

export interface FundingAnalysisResult {
  currentRate: number;
  trend1h: "rising" | "falling" | "stable";
  trend4h: "rising" | "falling" | "stable";
  trend24h: "rising" | "falling" | "stable";
  zScore: number;
  meanReversionProbability: "높음" | "보통" | "낮음";
  extremeSignal: string | null;
}

export interface OIAnalysisResult {
  currentOI: number;
  oiChangePercent: number;
  priceChangePercent: number;
  scenario:
    | "신규 롱 진입, 추세 강화"
    | "숏 청산, 추세 약화"
    | "신규 숏 진입, 하락 추세 강화"
    | "롱 청산, 하락 추세 약화";
  isSpike: boolean;
}

export interface PriceCluster {
  priceLevel: number;
  estimatedVolume: number;
  distancePercent: number;
}

export interface LiquidationClusterResult {
  longClusters: PriceCluster[];
  shortClusters: PriceCluster[];
  nearbyWarning: boolean;
  nearbyClusterSide: "long" | "short" | "both" | null;
}

// ============================================================
// AI Engine Types
// ============================================================

export interface AIInterpretation {
  riskInterpretation: string;
  srInterpretation: string;
  fundingInterpretation: string;
  oiInterpretation: string;
  liquidationInterpretation: string;
  overallSummary: string;
}

export interface RuleEngineResults {
  riskScore: RiskScoreResult;
  supportResistance: SupportResistanceResult;
  funding: FundingAnalysisResult;
  openInterest: OIAnalysisResult;
  liquidation: LiquidationClusterResult;
}

// ============================================================
// Data Freshness
// ============================================================

export interface DataFreshness {
  source: "live" | "cached";
  cachedAt?: string; // ISO 8601 timestamp when cached
}

// ============================================================
// Request Types
// ============================================================

export interface PositionAnalysisRequest {
  positions: OpenPosition[];
  symbol: string;
}

export interface FundingAnalysisRequest {
  symbol: string;
}

export interface OIAnalysisRequest {
  symbol: string;
}

export interface LiquidationAnalysisRequest {
  symbol: string;
}

// ============================================================
// Response Types
// ============================================================

export interface PositionAnalysisResponse {
  success: boolean;
  timestamp: string; // ISO 8601
  symbol: string;
  dataFreshness: DataFreshness;
  ruleEngine: RuleEngineResults;
  aiInterpretation: AIInterpretation | null;
}

export interface FundingAnalysisResponse {
  success: boolean;
  timestamp: string;
  symbol: string;
  dataFreshness: DataFreshness;
  ruleEngine: FundingAnalysisResult;
  aiInterpretation: { fundingInterpretation: string } | null;
}

export interface OIAnalysisResponse {
  success: boolean;
  timestamp: string;
  symbol: string;
  dataFreshness: DataFreshness;
  ruleEngine: OIAnalysisResult;
  aiInterpretation: { oiInterpretation: string } | null;
}

export interface LiquidationAnalysisResponse {
  success: boolean;
  timestamp: string;
  symbol: string;
  dataFreshness: DataFreshness;
  ruleEngine: LiquidationClusterResult;
  aiInterpretation: { liquidationInterpretation: string } | null;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
