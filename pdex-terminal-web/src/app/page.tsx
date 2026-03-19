'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import TopBar from '@/components/TopBar';
import PortfolioPanel from '@/components/PortfolioPanel';
import MarketPanel from '@/components/MarketPanel';
import AICopilotPanel from '@/components/AICopilotPanel';
import DiscoverPanel from '@/components/DiscoverPanel';
import BottomBar from '@/components/BottomBar';
import { useStore } from '@/stores/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getCandleSnapshot, getL2Book } from '@/lib/hyperliquid-api';
import { analyzePosition, analyzeOrder } from '@/lib/analysis-api';
import type { OpenPosition } from '@/lib/types';

function isValidWalletAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

function EmptyState() {
  const { setWalletAddress, setConnected, setError } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleConnect() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!isValidWalletAddress(trimmed)) {
      setValidationError('유효하지 않은 지갑 주소입니다');
      return;
    }
    setValidationError(null);
    setError(null);
    setWalletAddress(trimmed);
    setConnected(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleConnect();
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8">
      {/* Hero Icon */}
      <div className="select-none">
        <Image src="/icon.svg" alt="Calico Terminal" width={96} height={96} className="rounded-2xl opacity-90" />
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#c9d1d9] mb-2">
          Calico Terminal에 오신 것을 환영합니다
        </h1>
        <p className="text-sm text-[#8b949e] leading-relaxed">
          Hyperliquid 포지션을 실시간으로 모니터링하고
          <br />
          AI 기반 리스크 분석을 받아보세요
        </p>
      </div>

      {/* Large Address Input */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (validationError) setValidationError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="0x로 시작하는 지갑 주소를 입력하세요"
            className={`bg-[#161b22] border text-[#c9d1d9] px-5 py-3.5 rounded-[10px] w-[480px] text-[15px] outline-none placeholder:text-[#484f58] transition-colors focus:border-[#58a6ff] ${
              validationError ? 'border-[#f85149]' : 'border-[#30363d]'
            }`}
          />
          {validationError && (
            <div className="absolute top-full left-0 mt-1 text-[11px] text-[#f85149]">
              {validationError}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleConnect}
          className="bg-[#238636] text-white border-none px-7 py-3.5 rounded-[10px] cursor-pointer text-[15px] font-semibold hover:bg-[#2ea043] transition-colors"
        >
          연결하기
        </button>
      </div>

      {/* Feature Cards */}
      <div className="flex gap-5 mt-4">
        <FeatureCard icon="📊" title="실시간 포트폴리오" desc="포지션, 오더, 자산 현황을 실시간으로 확인" />
        <FeatureCard icon="📈" title="마켓 데이터" desc="차트, 오더북, 펀딩 레이트를 한 화면에서 확인" />
        <FeatureCard icon="🤖" title="AI 분석" desc="리스크, 펀딩, OI를 AI가 자동 분석" />
      </div>

      {/* Sample Address Hint */}
      <div className="mt-2 text-xs text-[#484f58]">
        테스트 주소:{' '}
        <button
          type="button"
          onClick={() => setInputValue('0x1234567890abcdef1234567890abcdef12345678')}
          className="text-[#58a6ff] underline cursor-pointer bg-transparent border-none text-xs"
        >
          0x1234...5678
        </button>{' '}
        를 클릭해서 체험해보세요
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 w-[200px] text-center">
      <div className="text-[28px] mb-2.5">{icon}</div>
      <div className="text-[13px] font-semibold mb-1.5">{title}</div>
      <div className="text-[11px] text-[#8b949e] leading-relaxed">{desc}</div>
    </div>
  );
}

function ConnectedLayout() {
  const walletAddress = useStore((s) => s.walletAddress);
  const selectedCoin = useStore((s) => s.selectedCoin);
  const selectedMode = useStore((s) => s.selectedMode);
  const timeframe = useStore((s) => s.timeframe);
  const setCandles = useStore((s) => s.setCandles);
  const setOrderbook = useStore((s) => s.setOrderbook);
  const setAnalysisLoading = useStore((s) => s.setAnalysisLoading);
  const setPositionAnalysis = useStore((s) => s.setPositionAnalysis);
  const setOrderAnalysis = useStore((s) => s.setOrderAnalysis);
  const addAlert = useStore((s) => s.addAlert);
  const fetchDiscoverRecommendations = useStore((s) => s.fetchDiscoverRecommendations);

  // Connect WebSocket for real-time data
  useWebSocket(walletAddress);

  // Track previous coin to avoid duplicate fetches
  const prevCoinRef = useRef<string | null>(null);
  const prevTimeframeRef = useRef<string | null>(null);

  // Load initial candle data + orderbook when coin or timeframe changes
  useEffect(() => {
    if (!selectedCoin) return;
    const coinChanged = prevCoinRef.current !== selectedCoin;
    const tfChanged = prevTimeframeRef.current !== timeframe;
    if (!coinChanged && !tfChanged) return;

    prevCoinRef.current = selectedCoin;
    prevTimeframeRef.current = timeframe;

    const now = Date.now();
    const intervalMs: Record<string, number> = {
      '1m': 60_000, '5m': 300_000, '15m': 900_000,
      '1H': 3_600_000, '4H': 14_400_000, '1D': 86_400_000,
    };
    const candleMs = intervalMs[timeframe] ?? 900_000;
    const startTime = now - candleMs * 300; // ~300 candles

    getCandleSnapshot(selectedCoin, timeframe, startTime, now)
      .then((raw) => {
        setCandles(
          raw.map((c) => ({
            timestamp: c.t,
            open: parseFloat(c.o),
            high: parseFloat(c.h),
            low: parseFloat(c.l),
            close: parseFloat(c.c),
            volume: parseFloat(c.v),
          })),
        );
      })
      .catch(() => {
        // Candle fetch failed silently — WS will provide live data
      });

    if (coinChanged) {
      getL2Book(selectedCoin)
        .then((book) => {
          let cumBid = 0;
          const bids = book.levels[0].map((l) => {
            const size = parseFloat(l.sz);
            cumBid += size;
            return { price: parseFloat(l.px), size, cumulative: cumBid };
          });
          let cumAsk = 0;
          const asks = book.levels[1].map((l) => {
            const size = parseFloat(l.sz);
            cumAsk += size;
            return { price: parseFloat(l.px), size, cumulative: cumAsk };
          });
          const bestBid = bids[0]?.price ?? 0;
          const bestAsk = asks[0]?.price ?? 0;
          const spread = bestAsk - bestBid;
          const mid = (bestAsk + bestBid) / 2;
          setOrderbook({
            bids, asks, spread,
            spreadPercent: mid > 0 ? (spread / mid) * 100 : 0,
          });
        })
        .catch(() => {});
    }
  }, [selectedCoin, timeframe, setCandles, setOrderbook]);

  // Trigger WAS analysis only when selectedCoin changes AND mode is position
  useEffect(() => {
    if (!selectedCoin || selectedMode !== 'position') {
      return;
    }

    const currentPositions = useStore.getState().positions;
    if (currentPositions.length === 0) {
      setPositionAnalysis(null);
      return;
    }

    setAnalysisLoading(true);

    const openPositions: OpenPosition[] = currentPositions.map((p) => ({
      coin: p.coin,
      side: p.side,
      entryPrice: p.entryPrice,
      size: p.size,
      leverage: p.leverage,
      liquidationPrice: p.liquidationPrice,
      marginUsed: p.marginUsed,
    }));

    analyzePosition({ positions: openPositions, symbol: selectedCoin, userAddress: walletAddress ?? undefined })
      .then((res) => {
        setPositionAnalysis(res);
      })
      .catch((err) => {
        addAlert({
          type: 'error',
          timestamp: Date.now(),
          message: `분석 실패: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
        setPositionAnalysis(null);
      })
      .finally(() => {
        setAnalysisLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoin, selectedMode]);

  // Trigger WAS order analysis when selectedCoin changes AND mode is order
  useEffect(() => {
    if (!selectedCoin || selectedMode !== 'order') {
      return;
    }

    const currentOrders = useStore.getState().orders;
    if (currentOrders.length === 0) {
      setOrderAnalysis(null);
      return;
    }

    const symbolOrders = currentOrders.filter((o) => o.coin === selectedCoin);
    if (symbolOrders.length === 0) {
      setOrderAnalysis(null);
      return;
    }

    setAnalysisLoading(true);

    const currentPositions = useStore.getState().positions;
    const openPositions: OpenPosition[] = currentPositions.map((p) => ({
      coin: p.coin,
      side: p.side,
      entryPrice: p.entryPrice,
      size: p.size,
      leverage: p.leverage,
      liquidationPrice: p.liquidationPrice,
      marginUsed: p.marginUsed,
    }));

    analyzeOrder({ orders: symbolOrders, positions: openPositions, symbol: selectedCoin })
      .then((res) => {
        setOrderAnalysis(res);
      })
      .catch((err) => {
        addAlert({
          type: 'error',
          timestamp: Date.now(),
          message: `오더 분석 실패: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
        setOrderAnalysis(null);
      })
      .finally(() => {
        setAnalysisLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoin, selectedMode]);

  // Auto-fetch discover recommendations when switching to discover mode
  useEffect(() => {
    if (selectedMode === 'discover') {
      fetchDiscoverRecommendations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMode]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[280px] shrink-0 border-r border-[#30363d] overflow-y-auto">
        <PortfolioPanel />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <MarketPanel />
      </div>
      <div className="w-[320px] shrink-0 border-l border-[#30363d] overflow-y-auto">
        {selectedMode === 'discover' ? <DiscoverPanel /> : <AICopilotPanel />}
      </div>
    </div>
  );
}

export default function Home() {
  const isConnected = useStore((s) => s.isConnected);

  return (
    <div className="flex flex-col h-screen">
      <TopBar />

      {isConnected ? <ConnectedLayout /> : <EmptyState />}

      {isConnected && <BottomBar />}
    </div>
  );
}
