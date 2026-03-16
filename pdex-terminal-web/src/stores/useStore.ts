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
  Alert,
  ActiveAssetCtx,
} from '@/lib/types';

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
  selectedMode: 'position' | 'order' | null;

  // AI Analysis
  positionAnalysis: PositionAnalysisResponse | null;
  fundingAnalysis: FundingAnalysisResponse | null;
  oiAnalysis: OIAnalysisResponse | null;
  liquidationAnalysis: LiquidationAnalysisResponse | null;
  analysisLoading: boolean;

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
  setSelectedMode: (mode: 'position' | 'order' | null) => void;
  setOrderbook: (orderbook: OrderbookData | null) => void;
  setCandles: (candles: CandleData[]) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setAllMids: (mids: Record<string, string>) => void;
  setActiveAssetCtx: (ctx: ActiveAssetCtx | null) => void;
  setPositionAnalysis: (analysis: PositionAnalysisResponse | null) => void;
  setFundingAnalysis: (analysis: FundingAnalysisResponse | null) => void;
  setOiAnalysis: (analysis: OIAnalysisResponse | null) => void;
  setLiquidationAnalysis: (analysis: LiquidationAnalysisResponse | null) => void;
  setAnalysisLoading: (loading: boolean) => void;
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
  selectedMode: null as 'position' | 'order' | null,
  orderbook: null as OrderbookData | null,
  candles: [] as CandleData[],
  timeframe: '15m' as Timeframe,
  allMids: {} as Record<string, string>,
  activeAssetCtx: null as ActiveAssetCtx | null,
  positionAnalysis: null as PositionAnalysisResponse | null,
  fundingAnalysis: null as FundingAnalysisResponse | null,
  oiAnalysis: null as OIAnalysisResponse | null,
  liquidationAnalysis: null as LiquidationAnalysisResponse | null,
  analysisLoading: false,
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
  setAnalysisLoading: (loading) => set({ analysisLoading: loading }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [...state.alerts, { ...alert, id: Date.now().toString() }],
    })),
  clearAlerts: () => set({ alerts: [] }),
  disconnect: () => set({ ...initialState }),
}));
