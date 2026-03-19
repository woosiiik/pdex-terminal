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
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 w-12 bg-[#30363d] rounded" />
        <div className="h-4 w-10 bg-[#30363d] rounded" />
      </div>
      <div className="h-3 w-full bg-[#30363d] rounded mb-1.5" />
      <div className="h-3 w-3/4 bg-[#30363d] rounded mb-1.5" />
      <div className="flex gap-2 mt-2">
        <div className="h-6 w-16 bg-[#30363d] rounded" />
        <div className="h-6 w-16 bg-[#30363d] rounded" />
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
  const dirColor = rec.direction === 'LONG' ? '#238636' : '#f85149';
  const changeColor = rec.changePercent24h >= 0 ? '#3fb950' : '#f85149';

  const confidenceMap = {
    high: { label: '신뢰도 높음', bg: 'bg-[#23863622]', text: 'text-[#3fb950]' },
    medium: { label: '신뢰도 보통', bg: 'bg-[#d2992222]', text: 'text-[#d29922]' },
    low: { label: '신뢰도 낮음', bg: 'bg-[#f8514922]', text: 'text-[#f85149]' },
  };
  const conf = confidenceMap[rec.confidence];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-[#161b22] border rounded-lg p-3 transition-colors hover:border-[#484f58] cursor-pointer ${
        isSelected ? 'border-[#58a6ff] border-2' : 'border-[#30363d]'
      }`}
    >
      {/* Header: coin + direction + confidence */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-[#c9d1d9]">{rec.coin}</span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: dirColor }}
          >
            {rec.direction}
          </span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${conf.bg} ${conf.text}`}>
          {conf.label}
        </span>
      </div>

      {/* Price + 24h change */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[13px] text-[#c9d1d9] font-mono">
          ${rec.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
        </span>
        <span className="text-[11px] font-mono" style={{ color: changeColor }}>
          {rec.changePercent24h >= 0 ? '+' : ''}{rec.changePercent24h.toFixed(2)}%
        </span>
      </div>

      {/* TP / SL */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 bg-[#23863615] border border-[#23863640] rounded px-2 py-1">
          <div className="text-[9px] text-[#3fb950] mb-0.5">TP</div>
          <div className="text-[12px] text-[#3fb950] font-mono">
            ${rec.tp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
        </div>
        <div className="flex-1 bg-[#f8514915] border border-[#f8514940] rounded px-2 py-1">
          <div className="text-[9px] text-[#f85149] mb-0.5">SL</div>
          <div className="text-[12px] text-[#f85149] font-mono">
            ${rec.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
        </div>
      </div>

      {/* Reason */}
      <p className="text-[11px] text-[#8b949e] leading-relaxed">{rec.reason}</p>
    </button>
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
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
        <div>
          <span className="text-[13px] font-semibold text-[#c9d1d9]">🔍 코인 추천</span>
          {discoverLastUpdated && (
            <div className="text-[10px] text-[#484f58] mt-0.5">{formatKST(discoverLastUpdated)}</div>
          )}
        </div>
        <button
          type="button"
          onClick={fetchDiscoverRecommendations}
          disabled={discoverLoading}
          className="text-[11px] bg-[#238636] text-white px-2.5 py-1 rounded hover:bg-[#2ea043] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {discoverLoading ? '분석 중...' : '새로운 추천 받기'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {discoverLoading && !discoverRecommendations ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !discoverRecommendations || discoverRecommendations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[28px] mb-2">🔍</div>
              <div className="text-[13px] text-[#8b949e]">추천 데이터가 없습니다</div>
              <div className="text-[11px] text-[#484f58] mt-1">위 버튼을 눌러 추천을 받아보세요</div>
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
