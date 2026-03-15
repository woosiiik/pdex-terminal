// ============================================================
// Hyperliquid Data Types
// ============================================================

export interface Position {
  coin: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  unrealizedPnl: number;
  pnlPercent: number;
  liquidationPrice: number;
  marginUsed: number;
}

export interface Order {
  coin: string;
  type: 'limit' | 'market';
  side: 'buy' | 'sell';
  price: number;
  size: number;
  timestamp: number;
}

export interface AccountSummary {
  totalValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  usedMargin: number;
  availableMargin: number;
  marginUsagePercent: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderbookLevel {
  price: number;
  size: number;
  cumulative: number;
}

export interface OrderbookData {
  asks: OrderbookLevel[];
  bids: OrderbookLevel[];
  spread: number;
  spreadPercent: number;
}

// ============================================================
// WAS API Response Types (aligned with pdex-terminal-was/src/types/index.ts)
// ============================================================

export interface RiskScoreResult {
  totalScore: number;
  leverageRisk: number;
  liquidationRisk: number;
  volatilityRisk: number;
  fundingCrowdRisk: number;
  concentrationRisk: number;
}

export interface SupportResistanceResult {
  shortTermHigh: number;
  shortTermLow: number;
  midTermHigh: number;
  midTermLow: number;
  vwap: number;
  pivotPoint: number;
  pivotR1: number;
  pivotS1: number;
}

export interface FundingAnalysisResult {
  currentRate: number;
  trend1h: 'rising' | 'falling' | 'stable';
  trend4h: 'rising' | 'falling' | 'stable';
  trend24h: 'rising' | 'falling' | 'stable';
  zScore: number;
  meanReversionProbability: '높음' | '보통' | '낮음';
  extremeSignal: string | null;
}

export interface OIAnalysisResult {
  currentOI: number;
  oiChangePercent: number;
  priceChangePercent: number;
  scenario:
    | '신규 롱 진입, 추세 강화'
    | '숏 청산, 추세 약화'
    | '신규 숏 진입, 하락 추세 강화'
    | '롱 청산, 하락 추세 약화';
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
  nearbyClusterSide: 'long' | 'short' | 'both' | null;
}

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

export interface DataFreshness {
  source: 'live' | 'cached';
  cachedAt?: string;
}

export interface PositionAnalysisResponse {
  success: boolean;
  timestamp: string;
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

// ============================================================
// Chart Types
// ============================================================

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

// ============================================================
// UI Types
// ============================================================

export interface Alert {
  id: string;
  type: 'warning' | 'success' | 'error';
  timestamp: number;
  message: string;
}

export interface OpenPosition {
  coin: string;
  side: 'long' | 'short';
  entryPrice: number;
  size: number;
  leverage: number;
  liquidationPrice: number;
  marginUsed: number;
}

// ============================================================
// WAS API Request Types
// ============================================================

export interface PositionAnalysisRequest {
  positions: OpenPosition[];
  symbol: string;
}

// ============================================================
// WAS Health Check
// ============================================================

export interface HealthResponse {
  status: string;
  timestamp: string;
  services: {
    redis: string;
    mysql: string;
    hyperliquid: string;
  };
}
