'use client';

import { useStore } from '@/stores/useStore';
import type { DiscoverRecommendation } from '@/lib/types';

function formatKST(isoString: string): string {
  const d = new Date(isoString);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  const ss = String(kst.getUTCSeconds()).padStart(2, '0');
  return `마지막 분석: ${hh}:${mm}:${ss} KST`;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[14px] p-2.5 mb-1.5 animate-pulse"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="h-3.5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="h-3 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div className="h-3 w-full rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-3 w-3/4 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="flex gap-2">
        <div className="flex-1 h-10 rounded-[8px]" style={{ background: 'rgba(52,211,153,0.06)' }} />
        <div className="flex-1 h-10 rounded-[8px]" style={{ background: 'rgba(248,113,113,0.06)' }} />
      </div>
    </div>
  );
}

interface DiscoverCardProps {
  recommendation: DiscoverRecommendation;
  isSelected: boolean;
  onClick: () => void;
}

function DiscoverCard({ recommendation: rec, isSelected, onClick }: DiscoverCardProps) {
  const isLong = rec.direction === 'LONG';
  const changePositive = rec.changePercent24h >= 0;

  const dirBadgeStyle = isLong
    ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34D399' }
    : { background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' };

  const confidenceMap = {
    high:   { label: '신뢰도 높음', color: '#34D399' },
    medium: { label: '신뢰도 보통', color: '#FBBF24' },
    low:    { label: '신뢰도 낮음', color: '#F87171' },
  };
  const conf = confidenceMap[rec.confidence];

  const cardBorder = isSelected
    ? '1px solid rgba(167,139,250,0.4)'
    : '1px solid rgba(167,139,250,0.15)';

  return (
    <div
      className="rounded-[14px] p-2.5 mb-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: cardBorder,
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.border = '1px solid rgba(167,139,250,0.4)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.border = '1px solid rgba(167,139,250,0.15)';
          e.currentTarget.style.transform = '';
        }
      }}
      onClick={onClick}
    >
      {/* Row 1: coin name + direction badge + confidence */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold" style={{ fontSize: 13 }}>{rec.coin}</span>
          <span
            className="px-1.5 py-0.5 rounded font-semibold"
            style={{ fontSize: 10, ...dirBadgeStyle }}
          >
            {rec.direction}
          </span>
        </div>
        <span style={{ fontSize: 10, color: conf.color }}>{conf.label}</span>
      </div>

      {/* Row 2: price + 24h change */}
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="font-mono text-white" style={{ fontSize: 13 }}>
          ${rec.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 11, color: changePositive ? '#34D399' : '#F87171' }}
        >
          {changePositive ? '+' : ''}{rec.changePercent24h.toFixed(2)}%
        </span>
      </div>

      {/* Row 3: TP / SL */}
      <div className="flex gap-2 mb-2.5">
        <div
          className="flex-1 px-2 py-1.5 rounded-[8px]"
          style={{
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.18)',
          }}
        >
          <div style={{ fontSize: 9, color: '#34D399', marginBottom: 2 }}>TP</div>
          <div className="font-mono" style={{ fontSize: 12, color: '#34D399' }}>
            ${rec.tp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
        </div>
        <div
          className="flex-1 px-2 py-1.5 rounded-[8px]"
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.18)',
          }}
        >
          <div style={{ fontSize: 9, color: '#F87171', marginBottom: 2 }}>SL</div>
          <div className="font-mono" style={{ fontSize: 12, color: '#F87171' }}>
            ${rec.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
        </div>
      </div>

      {/* Row 4: reason */}
      <div
        style={{
          background: 'rgba(167,139,250,0.08)',
          borderRadius: 8,
          padding: '6px 8px',
        }}
      >
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
          {rec.reason}
        </p>
      </div>
    </div>
  );
}

export default function DiscoverPanel() {
  const discoverRecommendations = useStore((s) => s.discoverRecommendations);
  const discoverLoading = useStore((s) => s.discoverLoading);
  const discoverLastUpdated = useStore((s) => s.discoverLastUpdated);
  const selectedCoin = useStore((s) => s.selectedCoin);
  const setSelectedCoin = useStore((s) => s.setSelectedCoin);
  const fetchDiscoverRecommendations = useStore((s) => s.fetchDiscoverRecommendations);

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Pretendard', sans-serif", background: '#120D28', border: '1px solid rgba(167,139,250,0.2)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div>
          <span className="font-semibold" style={{ fontSize: 13, color: '#C4B5FD' }}>✨ 코인 추천</span>
          {discoverLastUpdated && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {formatKST(discoverLastUpdated)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={fetchDiscoverRecommendations}
          disabled={discoverLoading}
          style={{
            background: '#7C3AED',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: discoverLoading ? 'not-allowed' : 'pointer',
            opacity: discoverLoading ? 0.5 : 1,
            transition: 'background 0.15s ease',
            fontFamily: "'Pretendard', sans-serif",
          }}
          onMouseEnter={e => { if (!discoverLoading) e.currentTarget.style.background = '#6D28D9'; }}
          onMouseLeave={e => { if (!discoverLoading) e.currentTarget.style.background = '#7C3AED'; }}
        >
          {discoverLoading ? '분석 중...' : '새로운 추천 받기'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {discoverLoading && !discoverRecommendations ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !discoverRecommendations || discoverRecommendations.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-[28px] mb-2">✨</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>추천 데이터가 없습니다</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                위 버튼을 눌러 추천을 받아보세요
              </div>
            </div>
          </div>
        ) : (
          discoverRecommendations.map((rec, i) => (
            <DiscoverCard
              key={`${rec.coin}-${i}`}
              recommendation={rec}
              isSelected={selectedCoin === rec.coin}
              onClick={() => setSelectedCoin(rec.coin)}
            />
          ))
        )}
      </div>
    </div>
  );
}
