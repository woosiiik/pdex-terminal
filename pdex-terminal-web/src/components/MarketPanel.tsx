'use client';

import { useRef, useEffect, useState } from 'react';
import { useStore } from '@/stores/useStore';
import type { Timeframe, OrderbookLevel } from '@/lib/types';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
} from 'lightweight-charts';

// ── Constants ──

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D'];

const ORDERBOOK_ROWS = 6;

// ── Helpers ──

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

// ── Main Component ──

export default function MarketPanel() {
  const selectedCoin = useStore((s) => s.selectedCoin);

  if (!selectedCoin) {
    return (
      <div className="h-full w-full flex items-center justify-center select-none">
        <div className="flex flex-col items-center text-center" style={{ gap: 12 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>코인을 선택하세요</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            포지션/오더에서 코인을 선택하거나<br />✨ AI 코인 추천 버튼을 눌러보세요
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      <MarketHeader coin={selectedCoin} />
      <TimeframeBar />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <CandlestickChart />
        </div>
        <div className="w-[200px] shrink-0 border-l border-[#30363d]">
          <Orderbook />
        </div>
      </div>
    </div>
  );
}

// ── Market Header ──

function MarketHeader({ coin }: { coin: string }) {
  const allMids = useStore((s) => s.allMids);
  const ctx = useStore((s) => s.activeAssetCtx);
  const markPrice = ctx?.markPx ?? (allMids[coin] ? parseFloat(allMids[coin]) : null);
  const oraclePrice = ctx?.oraclePx ?? null;

  // 24h change
  let change24h: string = '--';
  let change24hClass = 'text-[#c9d1d9]';
  if (ctx && ctx.prevDayPx > 0 && markPrice !== null) {
    const pct = ((markPrice - ctx.prevDayPx) / ctx.prevDayPx) * 100;
    change24h = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    change24hClass = pct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]';
  }

  return (
    <div className="flex items-center gap-5 px-4 py-2.5 shrink-0 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Coin name */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[15px] font-bold text-[#c9d1d9]">
          {coin}-USDC
        </span>
        <span className="bg-[#d29922]/20 text-[#d29922] text-[10px] px-1.5 py-0.5 rounded font-semibold">
          PERP
        </span>
      </div>

      <HeaderStat
        label="Mark"
        value={markPrice !== null ? formatNumber(markPrice) : '--'}
      />

      <HeaderStat
        label="Oracle"
        value={oraclePrice !== null ? formatNumber(oraclePrice) : '--'}
      />

      <HeaderStat label="24h" value={change24h} valueClass={change24hClass} />

      <HeaderStat
        label="Volume"
        value={ctx ? `$${formatCompact(ctx.dayNtlVlm)}` : '--'}
      />

      <HeaderStat
        label="Open Interest"
        value={ctx && markPrice ? `$${formatCompact(ctx.openInterest * markPrice)}` : '--'}
      />

      <HeaderStat
        label="Funding"
        value={ctx ? `${(ctx.funding * 100).toFixed(4)}%` : '--'}
        valueClass={ctx ? (ctx.funding >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]') : undefined}
      />

      <FundingCountdown />
    </div>
  );
}

function HeaderStat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col shrink-0">
      <span className="text-[10px] leading-none mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span className={`text-[12px] font-medium ${valueClass ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

function FundingCountdown() {
  const [countdown, setCountdown] = useState('--:--');

  useEffect(() => {
    function update() {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const diff = nextHour.getTime() - now.getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col shrink-0">
      <span className="text-[10px] leading-none mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Countdown</span>
      <span className="text-[12px] font-medium text-[#d29922] font-mono">{countdown}</span>
    </div>
  );
}

// ── Timeframe Bar ──

function TimeframeBar() {
  const timeframe = useStore((s) => s.timeframe);
  const setTimeframe = useStore((s) => s.setTimeframe);

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 shrink-0" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          type="button"
          onClick={() => setTimeframe(tf)}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            tf === timeframe
              ? 'bg-[#A78BFA]/15 text-[#A78BFA]'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

// ── Candlestick Chart ──

function CandlestickChart() {
  const candles = useStore((s) => s.candles);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  // Create chart on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#080818' },
        textColor: 'rgba(255,255,255,0.4)',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        vertLine: { color: '#58a6ff', width: 1, labelBackgroundColor: '#58a6ff' },
        horzLine: { color: '#58a6ff', width: 1, labelBackgroundColor: '#58a6ff' },
      },
      rightPriceScale: {
        borderColor: '#30363d',
      },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#3fb950',
      downColor: '#f85149',
      borderUpColor: '#3fb950',
      borderDownColor: '#f85149',
      wickUpColor: '#3fb950',
      wickDownColor: '#f85149',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (candles.length === 0) return;

    // Sort by time and deduplicate
    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    const deduped: typeof sorted = [];
    for (const c of sorted) {
      if (deduped.length === 0 || deduped[deduped.length - 1].timestamp !== c.timestamp) {
        deduped.push(c);
      } else {
        deduped[deduped.length - 1] = c; // keep latest for same timestamp
      }
    }

    const candleData = deduped.map((c) => ({
      time: (c.timestamp / 1000) as import('lightweight-charts').UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = deduped.map((c) => ({
      time: (c.timestamp / 1000) as import('lightweight-charts').UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 200 }}
    />
  );
}

// ── Orderbook ──

function Orderbook() {
  const orderbook = useStore((s) => s.orderbook);

  if (!orderbook) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-[#484f58]">
        오더북 로딩 중...
      </div>
    );
  }

  const asks = orderbook.asks.slice(0, ORDERBOOK_ROWS).reverse();
  const bids = orderbook.bids.slice(0, ORDERBOOK_ROWS);

  // Max cumulative for depth bar width
  const maxCumulative = Math.max(
    ...asks.map((l) => l.cumulative),
    ...bids.map((l) => l.cumulative),
    1,
  );

  return (
    <div className="flex flex-col h-full text-[11px] select-none">
      {/* Header */}
      <div className="flex justify-between px-2 py-1.5 text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      {/* Asks (red) */}
      <div className="flex flex-col justify-end flex-1 overflow-hidden">
        {asks.map((level, i) => (
          <OrderbookRow
            key={`ask-${i}`}
            level={level}
            side="ask"
            maxCumulative={maxCumulative}
          />
        ))}
      </div>

      {/* Spread */}
      <div className="flex justify-center items-center py-1.5 shrink-0" style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-[#8b949e] text-[11px]">
          Spread: {formatNumber(orderbook.spread)} ({orderbook.spreadPercent.toFixed(3)}%)
        </span>
      </div>

      {/* Bids (green) */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {bids.map((level, i) => (
          <OrderbookRow
            key={`bid-${i}`}
            level={level}
            side="bid"
            maxCumulative={maxCumulative}
          />
        ))}
      </div>
    </div>
  );
}

function OrderbookRow({
  level,
  side,
  maxCumulative,
}: {
  level: OrderbookLevel;
  side: 'ask' | 'bid';
  maxCumulative: number;
}) {
  const depthPercent = (level.cumulative / maxCumulative) * 100;
  const bgColor = side === 'ask' ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.12)';
  const priceColor = side === 'ask' ? 'text-[#f85149]' : 'text-[#3fb950]';

  return (
    <div className="relative flex justify-between items-center px-2 py-[3px]">
      {/* Depth background bar */}
      <div
        className="absolute top-0 bottom-0 right-0"
        style={{
          width: `${depthPercent}%`,
          background: bgColor,
        }}
      />
      <span className={`relative z-10 ${priceColor} font-mono`}>
        {formatNumber(level.price)}
      </span>
      <span className="relative z-10 text-[#c9d1d9] font-mono">
        {formatCompact(level.size)}
      </span>
      <span className="relative z-10 text-[#8b949e] font-mono">
        {formatCompact(level.cumulative)}
      </span>
    </div>
  );
}
