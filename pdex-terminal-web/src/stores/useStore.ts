import { create } from 'zustand';
import type {
  AccountSummary,
  Position,
  Order,
  OrderbookData,
  CandleData,
  Timeframe,
  PositionAnalysisResponse,
  FundingAnalysisResponse,
  OIAnalysisResponse,
  LiquidationAnalysisResponse,
  OrderAnalysisResponse,
  Alert,
  ActiveAssetCtx,
  DiscoverRecommendation,
} from '@/lib/types';
import { analyzeDiscover } from '@/lib/analysis-api';

interface AppState {
  // Connection
  walletAddress: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Portfolio
  accountSummary: AccountSummary | null;
  positions: Position[];
  orders: Order[];

  // Market
  selectedCoin: string | null;
  orderbook: OrderbookData | null;
  candles: CandleData[];
  timeframe: Timeframe;
  allMids: Record<string, string>;
  activeAssetCtx: ActiveAssetCtx | null;

  // Selection mode (position or order click in PortfolioPanel)
  selectedMode: 'discover' | 'position' | 'order' | null;

  // AI Analysis
  positionAnalysis: PositionAnalysisResponse | null;
  fundingAnalysis: FundingAnalysisResponse | null;
  oiAnalysis: OIAnalysisResponse | null;
  liquidationAnalysis: LiquidationAnalysisResponse | null;
  orderAnalysis: OrderAnalysisResponse | null;
  analysisLoading: boolean;

  // Discover
  discoverRecommendations: DiscoverRecommendation[] | null;
  discoverLoading: boolean;
  discoverLastUpdated: string | null;

  // Alerts
  alerts: Alert[];

  // Actions
  setWalletAddress: (address: string | null) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAccountSummary: (summary: AccountSummary | null) => void;
  setPositions: (positions: Position[]) => void;
  setOrders: (orders: Order[]) => void;
  setSelectedCoin: (coin: string | null) => void;
  setSelectedMode: (mode: 'discover' | 'position' | 'order' | null) => void;
  setOrderbook: (orderbook: OrderbookData | null) => void;
  setCandles: (candles: CandleData[]) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setAllMids: (mids: Record<string, string>) => void;
  setActiveAssetCtx: (ctx: ActiveAssetCtx | null) => void;
  setPositionAnalysis: (analysis: PositionAnalysisResponse | null) => void;
  setFundingAnalysis: (analysis: FundingAnalysisResponse | null) => void;
  setOiAnalysis: (analysis: OIAnalysisResponse | null) => void;
  setLiquidationAnalysis: (analysis: LiquidationAnalysisResponse | null) => void;
  setOrderAnalysis: (analysis: OrderAnalysisResponse | null) => void;
  setAnalysisLoading: (loading: boolean) => void;
  setDiscoverRecommendations: (recs: DiscoverRecommendation[] | null) => void;
  setDiscoverLoading: (loading: boolean) => void;
  setDiscoverLastUpdated: (ts: string | null) => void;
  fetchDiscoverRecommendations: () => Promise<void>;
  addAlert: (alert: Omit<Alert, 'id'>) => void;
  clearAlerts: () => void;
  disconnect: () => void;
}

const initialState = {
  walletAddress: null as string | null,
  isConnected: false,
  isLoading: false,
  error: null as string | null,
  accountSummary: null as AccountSummary | null,
  positions: [] as Position[],
  orders: [] as Order[],
  selectedCoin: null as string | null,
  selectedMode: null as 'discover' | 'position' | 'order' | null,
  orderbook: null as OrderbookData | null,
  candles: [] as CandleData[],
  timeframe: '15m' as Timeframe,
  allMids: {} as Record<string, string>,
  activeAssetCtx: null as ActiveAssetCtx | null,
  positionAnalysis: null as PositionAnalysisResponse | null,
  fundingAnalysis: null as FundingAnalysisResponse | null,
  oiAnalysis: null as OIAnalysisResponse | null,
  liquidationAnalysis: null as LiquidationAnalysisResponse | null,
  orderAnalysis: null as OrderAnalysisResponse | null,
  analysisLoading: false,
  discoverRecommendations: null as DiscoverRecommendation[] | null,
  discoverLoading: false,
  discoverLastUpdated: null as string | null,
  alerts: [] as Alert[],
};

export const useStore = create<AppState>((set) => ({
  ...initialState,

  setWalletAddress: (address) => set({ walletAddress: address }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setAccountSummary: (summary) => set({ accountSummary: summary }),
  setPositions: (positions) => set({ positions }),
  setOrders: (orders) => set({ orders }),
  setSelectedCoin: (coin) => set({ selectedCoin: coin }),
  setSelectedMode: (mode) => set({ selectedMode: mode }),
  setOrderbook: (orderbook) => set({ orderbook }),
  setCandles: (candles) => set({ candles }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setAllMids: (mids) => set({ allMids: mids }),
  setActiveAssetCtx: (ctx) => set({ activeAssetCtx: ctx }),
  setPositionAnalysis: (analysis) => set({ positionAnalysis: analysis }),
  setFundingAnalysis: (analysis) => set({ fundingAnalysis: analysis }),
  setOiAnalysis: (analysis) => set({ oiAnalysis: analysis }),
  setLiquidationAnalysis: (analysis) => set({ liquidationAnalysis: analysis }),
  setOrderAnalysis: (analysis) => set({ orderAnalysis: analysis }),
  setAnalysisLoading: (loading) => set({ analysisLoading: loading }),
  setDiscoverRecommendations: (recs) => set({ discoverRecommendations: recs }),
  setDiscoverLoading: (loading) => set({ discoverLoading: loading }),
  setDiscoverLastUpdated: (ts) => set({ discoverLastUpdated: ts }),
  fetchDiscoverRecommendations: async () => {
    set({ discoverLoading: true });
    try {
      const res = await analyzeDiscover();
      const firstCoin = res.recommendations?.[0]?.coin ?? null;
      set({
        discoverRecommendations: res.recommendations,
        discoverLastUpdated: res.timestamp,
        selectedCoin: firstCoin,
      });
    } catch (err) {
      set((state) => ({
        discoverRecommendations: null,
        alerts: [...state.alerts, {
          id: Date.now().toString(),
          type: 'error' as const,
          timestamp: Date.now(),
          message: `추천 분석 실패: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }],
      }));
    } finally {
      set({ discoverLoading: false });
    }
  },
  addAlert: (alert) =>
    set((state) => ({
      alerts: [...state.alerts, { ...alert, id: Date.now().toString() }],
    })),
  clearAlerts: () => set({ alerts: [] }),
  disconnect: () => set({ ...initialState }),
}));
