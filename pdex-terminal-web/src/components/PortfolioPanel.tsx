'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/stores/useStore';

function formatPnl(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = value >= 0 ? '+$' : '-$';
  return prefix + formatted;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function PortfolioPanel() {
  const accountSummary = useStore((s) => s.accountSummary);
  const positions = useStore((s) => s.positions);
  const orders = useStore((s) => s.orders);
  const selectedCoin = useStore((s) => s.selectedCoin);
  const selectedMode = useStore((s) => s.selectedMode);
  const setSelectedCoin = useStore((s) => s.setSelectedCoin);
  const setSelectedMode = useStore((s) => s.setSelectedMode);

  return (
    <div className="flex flex-col p-3 gap-1" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 계정 요약 */}
      <AccountSummaryCard summary={accountSummary} />

      {/* 오픈 포지션 */}
      <div
        className="uppercase mt-3.5 mb-2"
        style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.05em' }}
      >
        오픈 포지션
      </div>
      {positions.length === 0 ? (
        <div className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          오픈 포지션이 없습니다
        </div>
      ) : (
        positions.map((pos) => {
          const isSelected =
            selectedCoin === pos.coin && selectedMode === 'position';
          return (
            <PositionCard
              key={pos.coin}
              coin={pos.coin}
              side={pos.side}
              leverage={pos.leverage}
              entryPrice={pos.entryPrice}
              currentPrice={pos.currentPrice}
              unrealizedPnl={pos.unrealizedPnl}
              pnlPercent={pos.pnlPercent}
              liquidationPrice={pos.liquidationPrice}
              isSelected={isSelected}
              onClick={() => {
                setSelectedCoin(pos.coin);
                setSelectedMode('position');
              }}
            />
          );
        })
      )}

      {/* 오픈 오더 */}
      <div
        className="uppercase mt-3.5 mb-2"
        style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.05em' }}
      >
        오픈 오더
      </div>

      {orders.length === 0 ? (
        <div className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          오픈 오더가 없습니다
        </div>
      ) : (
        orders.map((order, idx) => {
          const isSelected =
            selectedCoin === order.coin && selectedMode === 'order';
          return (
            <OrderCard
              key={`${order.coin}-${order.price}-${idx}`}
              coin={order.coin}
              side={order.side}
              type={order.type}
              price={order.price}
              size={order.size}
              timestamp={order.timestamp}
              isSelected={isSelected}
              onClick={() => {
                setSelectedCoin(order.coin);
                setSelectedMode('order');
              }}
            />
          );
        })
      )}
    </div>
  );
}

// ── Account Summary Card ──

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    const steps = 40;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / steps, 3);
      setValue(target * ease);
      if (step >= steps) { setValue(target); clearInterval(timer); }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

function AccountSummaryCard({
  summary,
}: {
  summary: import('@/lib/types').AccountSummary | null;
}) {
  const totalValue       = useCountUp(summary?.totalValue ?? 0);
  const unrealizedPnl    = useCountUp(summary?.unrealizedPnl ?? 0);
  const usedMargin       = useCountUp(summary?.usedMargin ?? 0);
  const availableMargin  = useCountUp(summary?.availableMargin ?? 0);
  const marginUsagePct   = useCountUp(summary?.marginUsagePercent ?? 0);

  if (!summary) {
    return (
      <div className="rounded-[14px] p-2.5" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <div className="text-xs text-center py-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          계정 데이터 로딩 중...
        </div>
      </div>
    );
  }

  const pnlPositive   = summary.unrealizedPnl >= 0;
  const pnlColor      = pnlPositive ? '#34D399' : '#F87171';
  const pnlSign       = pnlPositive ? '+$' : '-$';
  const pnlAbs        = Math.abs(unrealizedPnl).toFixed(2);
  // 마진 사용률 프로그레스 바는 항상 #A78BFA (보라)
  const progressColor = '#A78BFA';

  const metricCardStyle = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.15)',
    transition: 'all 0.2s ease',
  };

  return (
    <div className="rounded-[14px] overflow-hidden" style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
      {/* 상단: 총 자산 + 미실현 PnL */}
      <div className="px-3 py-3">
        <div className="mb-1" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>총 자산</div>
        <div className="leading-none tabular-nums text-white" style={{ fontSize: 28, fontWeight: 700 }}>
          ${totalValue.toFixed(2)}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>미실현 PnL</span>
          <span className="tabular-nums font-semibold" style={{ fontSize: 13, color: pnlColor }}>
            {pnlSign}{pnlAbs}
          </span>
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-[#30363d]" />

      {/* 하단: Metric 카드 그리드 */}
      <div className="p-2.5 grid grid-cols-2 gap-2">
        <div
          className="rounded-md px-2.5 py-2 cursor-default"
          style={metricCardStyle}
          onMouseEnter={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.28)')}
          onMouseLeave={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)')}
        >
          <div className="mb-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>사용 마진</div>
          <div className="tabular-nums font-semibold text-white" style={{ fontSize: 13 }}>
            ${usedMargin.toFixed(2)}
          </div>
        </div>

        <div
          className="rounded-md px-2.5 py-2 cursor-default"
          style={metricCardStyle}
          onMouseEnter={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.28)')}
          onMouseLeave={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)')}
        >
          <div className="mb-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>가용 마진</div>
          <div className="tabular-nums font-semibold text-white" style={{ fontSize: 13 }}>
            ${availableMargin.toFixed(2)}
          </div>
        </div>

        {/* 마진 사용률 — full width */}
        <div
          className="rounded-md px-2.5 py-2 col-span-2 cursor-default"
          style={metricCardStyle}
          onMouseEnter={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.28)')}
          onMouseLeave={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)')}
        >
          <div className="flex justify-between items-center mb-1.5">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>마진 사용률</div>
            <div className="tabular-nums font-semibold" style={{ fontSize: 13, color: progressColor }}>
              {marginUsagePct.toFixed(1)}%
            </div>
          </div>
          <div className="h-1.5 bg-[#30363d] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(marginUsagePct, 100)}%`,
                background: progressColor,
                boxShadow: `0 0 6px ${progressColor}99`,
                transition: 'width 0.05s linear',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Position Card ──

function PositionCard({
  coin,
  side,
  leverage,
  entryPrice,
  currentPrice,
  unrealizedPnl,
  pnlPercent,
  liquidationPrice,
  isSelected,
  onClick,
}: {
  coin: string;
  side: 'long' | 'short';
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  pnlPercent: number;
  liquidationPrice: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isLong = side === 'long';
  const pnlColor = unrealizedPnl >= 0 ? '#34D399' : '#F87171';
  const badgeLabel = isLong ? `LONG ${leverage}x` : `SHORT ${leverage}x`;
  const badgeStyle = isLong
    ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399' }
    : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171' };
  const cardBorderStyle = isSelected
    ? { border: '1px solid rgba(255,255,255,0.3)' }
    : { border: '1px solid rgba(255,255,255,0.15)' };

  return (
    <div
      className="rounded-[14px] p-2.5 mb-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-1"
      style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', ...cardBorderStyle }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.28)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
      onClick={onClick}
    >
      {/* Row 1: coin + badge */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-white" style={{ fontSize: 13 }}>
          {coin}-PERP
        </span>
        <span className="px-2 py-0.5 rounded font-medium" style={{ fontSize: 11, ...badgeStyle }}>
          {badgeLabel}
        </span>
      </div>

      {/* Row 2: entry + current price */}
      <div className="flex justify-between mb-2">
        <div className="flex flex-col gap-0.5">
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>진입가</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>${entryPrice.toLocaleString()}</span>
        </div>
        <div className="flex flex-col gap-0.5 items-end">
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>현재가</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>${currentPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Row 3: PnL + liquidation */}
      <div className="flex justify-between items-end">
        <span className="tabular-nums" style={{ fontSize: 15, fontWeight: 700, color: pnlColor }}>
          {formatPnl(unrealizedPnl)} ({formatPercent(pnlPercent)})
        </span>
        <div className="flex flex-col items-end gap-0.5">
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>청산</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>${liquidationPrice.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Order Card ──

function OrderCard({
  coin,
  side,
  type,
  price,
  size,
  timestamp,
  isSelected,
  onClick,
}: {
  coin: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: number;
  size: number;
  timestamp: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isBuy = side === 'buy';
  const typeLabel = type === 'limit'
    ? isBuy
      ? '매수 지정가'
      : '매도 지정가'
    : isBuy
      ? '매수 시장가'
      : '매도 시장가';
  const badgeStyle = isBuy
    ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399' }
    : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171' };
  const cardBorderStyle = isSelected
    ? { border: '1px solid rgba(255,255,255,0.3)' }
    : { border: '1px solid rgba(255,255,255,0.15)' };

  const priceStr = price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <div
      className="rounded-[14px] p-2.5 mb-1.5 cursor-pointer transition-all duration-200"
      style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', ...cardBorderStyle }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.28)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
      onClick={onClick}
    >
      {/* Row 1: coin + type badge */}
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-semibold text-white" style={{ fontSize: 13 }}>
          {coin}-PERP
        </span>
        <span className="px-2 py-0.5 rounded font-medium" style={{ fontSize: 11, ...badgeStyle }}>
          {typeLabel}
        </span>
      </div>

      {/* Row 2: price · size (left) + time (right) */}
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          ${priceStr} · {size} {coin}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
