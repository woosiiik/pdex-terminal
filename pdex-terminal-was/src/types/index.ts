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
// Order Analysis Result Types
// ============================================================

export interface OpenOrder {
  coin: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price: number;
  size: number;
  timestamp: number;
}

export type StrategyType = "grid" | "range" | "breakout" | "accumulation" | "unknown";

export interface StrategyDetectionResult {
  detectedStrategy: StrategyType;
  confidence: "high" | "medium" | "low";
  description: string;
  orderCount: number;
  priceRange: { min: number; max: number };
  buyCount: number;
  sellCount: number;
}

export type ExecutionProbability = "high" | "medium" | "low";

export interface ExecutionProbabilityItem {
  coin: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  distancePercent: number;
  probability: ExecutionProbability;
}

export interface ExecutionProbabilityResult {
  items: ExecutionProbabilityItem[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export type ClusterType = "sell_wall" | "accumulation_zone" | "distribution_zone";

export interface OrderCluster {
  priceLevel: number;
  totalSize: number;
  orderCount: number;
  side: "buy" | "sell";
  clusterType: ClusterType;
  distancePercent: number;
}

export interface OrderClusterResult {
  clusters: OrderCluster[];
  dominantSide: "buy" | "sell" | "balanced";
}

export type OrderPurpose = "take_profit" | "stop_loss" | "hedging" | "position_expansion" | "new_entry";

export interface PositionImpactItem {
  coin: string;
  orderSide: "buy" | "sell";
  orderPrice: number;
  orderSize: number;
  purpose: OrderPurpose;
  description: string;
}

export interface PositionImpactResult {
  items: PositionImpactItem[];
  hasRiskReduction: boolean;
  hasRiskIncrease: boolean;
}

export interface OrderAnalysisRuleEngineResults {
  strategy: StrategyDetectionResult;
  executionProbability: ExecutionProbabilityResult;
  orderClusters: OrderClusterResult;
  positionImpact: PositionImpactResult;
}

export interface OrderAnalysisAIInterpretation {
  strategyInterpretation: string;
  executionInterpretation: string;
  clusterInterpretation: string;
  impactInterpretation: string;
  overallSummary: string;
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

export interface OrderAnalysisResponse {
  success: boolean;
  timestamp: string;
  symbol: string;
  ruleEngine: OrderAnalysisRuleEngineResults;
  aiInterpretation: OrderAnalysisAIInterpretation | null;
}

// ============================================================
// L2 Orderbook
// ============================================================

export interface L2BookLevel {
  price: number;
  size: number;
}

export interface L2Book {
  bids: L2BookLevel[];
  asks: L2BookLevel[];
}

// ============================================================
// Order Analysis Market Context
// ============================================================

export interface OrderMarketContext {
  volatility24h: number;
  fundingRate: number;
  l2Book: L2Book | null;
}
