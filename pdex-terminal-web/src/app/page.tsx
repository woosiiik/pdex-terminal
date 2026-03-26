'use client';

import React, { useState, useEffect, useRef } from 'react';
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

// Removes white background from an image using BFS flood-fill from the border.
// Only border-connected near-white pixels are made transparent, preserving
// white/light areas inside the subject (e.g. white cat fur).
function CatHeroImage({ size = 300 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;

      const visited = new Uint8Array(w * h);
      const queue: number[] = [];
      const THRESHOLD = 210; // pixels brighter than this are "background"

      function isNearWhite(idx: number) {
        const i = idx * 4;
        return d[i] > THRESHOLD && d[i + 1] > THRESHOLD && d[i + 2] > THRESHOLD;
      }

      function enqueue(x: number, y: number) {
        const idx = y * w + x;
        if (!visited[idx] && isNearWhite(idx)) {
          visited[idx] = 1;
          queue.push(idx);
        }
      }

      // Seed BFS from all 4 edges
      for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
      for (let y = 1; y < h - 1; y++) { enqueue(0, y); enqueue(w - 1, y); }

      // BFS flood-fill
      while (queue.length > 0) {
        const idx = queue.pop()!;
        const x = idx % w;
        const y = (idx - x) / w;
        const i = idx * 4;
        // Feather alpha based on brightness
        const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
        const alpha = brightness > 230 ? 0 : Math.round(255 * (1 - (brightness - THRESHOLD) / (230 - THRESHOLD)));
        d[i + 3] = Math.min(d[i + 3], alpha);

        // Expand to 4-connected neighbors
        if (x > 0)     { const n = idx - 1;     if (!visited[n] && isNearWhite(n)) { visited[n] = 1; queue.push(n); } }
        if (x < w - 1) { const n = idx + 1;     if (!visited[n] && isNearWhite(n)) { visited[n] = 1; queue.push(n); } }
        if (y > 0)     { const n = idx - w;     if (!visited[n] && isNearWhite(n)) { visited[n] = 1; queue.push(n); } }
        if (y < h - 1) { const n = idx + w;     if (!visited[n] && isNearWhite(n)) { visited[n] = 1; queue.push(n); } }
      }

      ctx.putImageData(imageData, 0, 0);
    };
    img.src = '/cat-hero.png';
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'drop-shadow(0 8px 32px rgba(124,58,237,0.35))',
      }}
    />
  );
}

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
    <div
      className="flex-1 flex items-center justify-center"
      style={{ position: 'relative', zIndex: 1, paddingLeft: 70, paddingRight: 40 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '6fr 4fr', alignItems: 'center', width: '100%', maxWidth: 1100, gap: 0 }}>

        {/* Left 60%: Text + Input + Feature Cards */}
        <div className="flex flex-col gap-7 relative z-10">

          {/* Title */}
          <div>
            <h1
              className="font-bold mb-3 leading-tight"
              style={{
                fontSize: 30,
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              지갑 주소 하나로 시작하세요
            </h1>
            <p className="text-sm text-[#a89fd4] leading-relaxed">
              Hyperliquid 실시간 포지션 모니터링과 AI 리스크 분석을 한 곳에서
            </p>
          </div>

          {/* Address Input */}
          <div className="relative">
            <div
              className="wallet-input-wrap flex items-center bg-transparent rounded-[20px] px-6 py-4"
              style={{ border: '1.5px solid #6C63FF', boxShadow: '0 4px 24px rgba(108, 99, 255, 0.12)' }}
            >
              <div className="search-icon-animate shrink-0 mr-4 cursor-pointer" onClick={handleConnect}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="7" stroke="#a78bfa" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="m16.5 16.5 3.5 3.5" stroke="#a78bfa" strokeWidth="2.4" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="0x로 시작하는 지갑 주소를 입력하세요"
                className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder:text-white/70"
              />
              <button
                type="button"
                onClick={() => { setInputValue(''); setValidationError(null); }}
                className={`wallet-clear-btn shrink-0 ml-3 text-white/60 hover:text-white/90 bg-transparent border-none cursor-pointer p-0.5 rounded-full transition-colors${inputValue ? ' visible' : ''}`}
                tabIndex={-1}
                aria-label="입력 초기화"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.15)"/>
                  <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {validationError && (
              <div className="absolute top-full left-0 mt-2 text-[11px] text-[#f87171]">
                {validationError}
              </div>
            )}
          </div>

          {/* Feature Cards */}
          <div className="flex gap-4">
            <FeatureCard
              index={0}
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
              }
              title="실시간 포트폴리오"
              desc="포지션, 오더, 자산 현황을 실시간으로 확인"
            />
            <FeatureCard
              index={1}
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              }
              title="마켓 데이터"
              desc="차트, 오더북, 펀딩 레이트를 한 화면에서 확인"
            />
            <FeatureCard
              index={2}
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2"/>
                  <circle cx="12" cy="5" r="2"/><path d="M12 7v4"/>
                  <circle cx="8" cy="16" r="1" fill="#a78bfa"/><circle cx="16" cy="16" r="1" fill="#a78bfa"/>
                </svg>
              }
              title="AI 분석"
              desc="리스크, 펀딩, OI를 AI가 자동 분석"
            />
          </div>

          {/* Sample Address Hint */}
          <div className="text-xs text-[#6d6494]">
            테스트 주소:{' '}
            <button
              type="button"
              onClick={() => setInputValue('0x1234567890abcdef1234567890abcdef12345678')}
              className="text-[#a78bfa] font-semibold underline cursor-pointer bg-transparent border-none text-xs"
            >
              0x1234...5678
            </button>{' '}
            를 클릭해서 체험해보세요
          </div>
        </div>

        {/* Right 40%: Cat Character */}
        <div
          className="relative z-10 select-none flex items-center justify-center"
          style={{ marginRight: 48 }}
        >
          <CatHeroImage size={350} />
        </div>

      </div>
    </div>
  );
}

const CARD_STYLES = [
  { background: '#0E0E1A', border: '1px solid rgba(255,255,255,0.07)' },
  { background: '#0C0F1A', border: '1px solid rgba(255,255,255,0.07)' },
  { background: 'linear-gradient(135deg, #120D1F 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(124,58,237,0.3)' },
];

function FeatureCard({ index, icon, title, desc }: { index: number; icon: React.ReactNode; title: string; desc: string }) {
  const cardStyle = CARD_STYLES[index] ?? CARD_STYLES[0];
  return (
    <div
      className="feature-card flex-1 flex flex-col justify-between p-5 cursor-default transition-all duration-200 hover:-translate-y-1"
      style={{
        minHeight: 160,
        borderRadius: 16,
        background: cardStyle.background,
        border: cardStyle.border,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = index === 2
          ? '1px solid rgba(124,58,237,0.6)'
          : '1px solid rgba(255,255,255,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = cardStyle.border;
      }}
    >
      <div>{icon}</div>
      <div>
        <div className="text-white mb-1" style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
        <div className="break-keep" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{desc}</div>
      </div>
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
      <div className="w-[280px] shrink-0 overflow-y-auto portfolio-scroll" style={{ borderRight: '1px solid rgba(255,255,255,0.07)', position: 'relative', zIndex: 1 }}>
        <PortfolioPanel />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        <MarketPanel />
      </div>
      <div className="w-[320px] shrink-0 overflow-y-auto" style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', position: 'relative', zIndex: 1 }}>
        {selectedMode === 'discover' ? <DiscoverPanel /> : <AICopilotPanel />}
      </div>
    </div>
  );
}

export default function Home() {
  const isConnected = useStore((s) => s.isConnected);

  return (
    <div className="flex flex-col h-screen" style={{ position: 'relative', zIndex: 1 }}>
      <TopBar />

      {isConnected ? <ConnectedLayout /> : <EmptyState />}

      {isConnected && <BottomBar />}
    </div>
  );
}
