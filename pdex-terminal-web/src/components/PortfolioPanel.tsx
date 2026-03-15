'use client';

import { useStore } from '@/stores/useStore';

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = value < 0 ? '-$' : '$';
  return prefix + formatted;
}

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
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-1">
      {/* 계정 요약 */}
      <AccountSummaryCard summary={accountSummary} />

      {/* 오픈 포지션 */}
      <div className="text-[11px] text-[#8b949e] uppercase tracking-[1px] mt-3.5 mb-2">
        오픈 포지션
      </div>
      {positions.length === 0 ? (
        <div className="text-xs text-[#484f58] text-center py-4">
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
      <div className="text-[11px] text-[#8b949e] uppercase tracking-[1px] mt-3.5 mb-2">
        오픈 오더
      </div>

      {orders.length === 0 ? (
        <div className="text-xs text-[#484f58] text-center py-4">
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

function AccountSummaryCard({
  summary,
}: {
  summary: import('@/lib/types').AccountSummary | null;
}) {
  if (!summary) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-2.5">
        <div className="text-xs text-[#484f58] text-center py-2">
          계정 데이터 로딩 중...
        </div>
      </div>
    );
  }

  const pnlColor =
    summary.unrealizedPnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]';

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-2.5 flex flex-col gap-1">
      <SummaryRow label="총 자산" value={formatUsd(summary.totalValue)} bold />
      <SummaryRow
        label="미실현 PnL"
        value={formatPnl(summary.unrealizedPnl)}
        valueClass={`${pnlColor} font-semibold`}
      />
      <SummaryRow label="사용 마진" value={formatUsd(summary.usedMargin)} />
      <SummaryRow
        label="가용 마진"
        value={formatUsd(summary.availableMargin)}
      />
      <SummaryRow
        label="마진 사용률"
        value={`${summary.marginUsagePercent.toFixed(1)}%`}
        valueClass="text-[#d29922] font-semibold"
      />
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[#8b949e]">{label}</span>
      <span className={valueClass ?? (bold ? 'font-semibold' : '')}>
        {value}
      </span>
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
  const pnlColor =
    unrealizedPnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]';
  const badgeBg = isLong ? 'bg-[#238636]' : 'bg-[#f85149]';
  const badgeLabel = isLong
    ? `LONG ${leverage}x`
    : `SHORT ${leverage}x`;
  const borderClass = isSelected
    ? 'border-2 border-[#58a6ff]'
    : 'border border-[#30363d]';

  return (
    <div
      className={`bg-[#161b22] ${borderClass} rounded-lg p-2.5 mb-1.5 cursor-pointer hover:border-[#58a6ff]/50 transition-colors`}
      onClick={onClick}
    >
      {/* Row 1: coin + badge */}
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-semibold text-[13px] text-[#58a6ff]">
          {coin}-PERP
        </span>
        <span
          className={`${badgeBg} text-white text-[11px] px-2 py-0.5 rounded`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Row 2: entry + current price */}
      <div className="flex justify-between text-[11px] text-[#8b949e] mb-1">
        <span>진입 ${entryPrice.toLocaleString()}</span>
        <span>현재 ${currentPrice.toLocaleString()}</span>
      </div>

      {/* Row 3: PnL + liquidation */}
      <div className="flex justify-between text-[11px]">
        <span className={`${pnlColor} font-semibold`}>
          {formatPnl(unrealizedPnl)} ({formatPercent(pnlPercent)})
        </span>
        <span className="text-[#8b949e]">
          청산 ${liquidationPrice.toLocaleString()}
        </span>
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
  const badgeBg = isBuy ? 'bg-[#238636]/25' : 'bg-[#f85149]/25';
  const badgeText = isBuy ? 'text-[#3fb950]' : 'text-[#f85149]';
  const borderClass = isSelected
    ? 'border-2 border-[#58a6ff]'
    : 'border border-[#30363d]';

  return (
    <div
      className={`bg-[#161b22] ${borderClass} rounded-lg p-2.5 mb-1.5 cursor-pointer hover:border-[#58a6ff]/50 transition-colors`}
      onClick={onClick}
    >
      {/* Row 1: coin + type badge */}
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-semibold text-[13px] text-[#58a6ff]">
          {coin}-PERP
        </span>
        <span
          className={`${badgeBg} ${badgeText} text-[11px] px-2 py-0.5 rounded`}
        >
          {typeLabel}
        </span>
      </div>

      {/* Row 2: price, size, time */}
      <div className="flex justify-between text-[11px] text-[#8b949e]">
        <span>${price.toLocaleString()}</span>
        <span>{size} {coin}</span>
        <span>{formatTime(timestamp)}</span>
      </div>
    </div>
  );
}
