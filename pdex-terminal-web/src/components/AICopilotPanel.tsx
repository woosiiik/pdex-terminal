'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import type {
  AIInterpretation,
  RuleEngineResults,
} from '@/lib/types';

type PositionTabId = 'risk' | 'funding' | 'oi' | 'liq' | 'suggest';
type OrderTabId = 'order-strategy' | 'order-execution' | 'order-concentration' | 'order-impact' | 'order-suggest';

const POSITION_TABS: { id: PositionTabId; label: string }[] = [
  { id: 'risk', label: '리스크' },
  { id: 'funding', label: '펀딩' },
  { id: 'oi', label: 'OI' },
  { id: 'liq', label: '청산' },
  { id: 'suggest', label: '제안' },
];

const ORDER_TABS: { id: OrderTabId; label: string }[] = [
  { id: 'order-strategy', label: '전략' },
  { id: 'order-execution', label: '체결' },
  { id: 'order-concentration', label: '집중도' },
  { id: 'order-impact', label: '영향' },
  { id: 'order-suggest', label: '제안' },
];

export default function AICopilotPanel() {
  const [positionTab, setPositionTab] = useState<PositionTabId>('risk');
  const [orderTab, setOrderTab] = useState<OrderTabId>('order-strategy');
  const positionAnalysis = useStore((s) => s.positionAnalysis);
  const analysisLoading = useStore((s) => s.analysisLoading);
  const selectedCoin = useStore((s) => s.selectedCoin);
  const selectedMode = useStore((s) => s.selectedMode);

  if (!selectedCoin) {
    return (
      <div className="flex flex-col h-full">
        <TabHeader tabs={POSITION_TABS} activeTab={positionTab} onTabChange={setPositionTab} />
        <div className="flex-1 flex items-center justify-center text-xs text-[#484f58]">
          코인을 선택하세요
        </div>
      </div>
    );
  }

  // Order mode — show coming soon tabs
  if (selectedMode === 'order') {
    return (
      <div className="flex flex-col h-full">
        <TabHeader tabs={ORDER_TABS} activeTab={orderTab} onTabChange={setOrderTab} />
        <div className="flex-1 p-3 overflow-y-auto">
          <ComingSoon coin={selectedCoin} />
        </div>
      </div>
    );
  }

  // Position mode
  if (analysisLoading) {
    return (
      <div className="flex flex-col h-full">
        <TabHeader tabs={POSITION_TABS} activeTab={positionTab} onTabChange={setPositionTab} />
        <div className="flex-1 p-3 space-y-3">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  const ruleEngine = positionAnalysis?.ruleEngine ?? null;
  const ai = positionAnalysis?.aiInterpretation ?? null;

  return (
    <div className="flex flex-col h-full">
      <TabHeader tabs={POSITION_TABS} activeTab={positionTab} onTabChange={setPositionTab} />
      <div className="flex-1 p-3 overflow-y-auto">
        {positionTab === 'risk' && <RiskTab ruleEngine={ruleEngine} ai={ai} />}
        {positionTab === 'funding' && <FundingTab ruleEngine={ruleEngine} ai={ai} />}
        {positionTab === 'oi' && <OITab ruleEngine={ruleEngine} ai={ai} />}
        {positionTab === 'liq' && <LiquidationTab ruleEngine={ruleEngine} ai={ai} />}
        {positionTab === 'suggest' && <SuggestTab ruleEngine={ruleEngine} ai={ai} />}
      </div>
    </div>
  );
}

// ── Coming Soon (Order Analysis) ──

function ComingSoon({ coin }: { coin: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="text-[40px] opacity-30 select-none">🚧</div>
      <div className="text-center">
        <div className="text-[13px] font-semibold text-[#c9d1d9] mb-1">
          {coin}-PERP 오더 분석
        </div>
        <div className="text-[12px] text-[#8b949e] leading-relaxed">
          오픈 오더 분석 기능은 준비 중입니다
        </div>
        <div className="text-[11px] text-[#484f58] mt-3">Coming Soon</div>
      </div>
    </div>
  );
}

// ── Tab Header ──

function TabHeader<T extends string>({ tabs, activeTab, onTabChange }: { tabs: { id: T; label: string }[]; activeTab: T; onTabChange: (t: T) => void }) {
  return (
    <div className="flex bg-[#161b22] border-b border-[#30363d] shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2.5 text-xs cursor-pointer border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'text-[#58a6ff] border-[#58a6ff]'
              : 'text-[#8b949e] border-transparent hover:text-[#c9d1d9]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Loading Skeleton ──

function LoadingSkeleton() {
  return (
    <>
      <div className="text-xs text-[#8b949e] text-center py-4 animate-pulse">
        분석 중...
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 animate-pulse">
          <div className="h-3 bg-[#30363d] rounded w-2/3 mb-2" />
          <div className="h-3 bg-[#30363d] rounded w-1/2 mb-2" />
          <div className="h-3 bg-[#30363d] rounded w-3/4" />
        </div>
      ))}
    </>
  );
}

// ── Shared Helpers ──

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 mb-2.5">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-[#8b949e] mb-1.5">{children}</div>
  );
}

function InterpretationBox({ text }: { text: string }) {
  return (
    <div className="text-[12px] leading-[1.8] text-[#8b949e] mt-2 whitespace-pre-wrap">
      {text}
    </div>
  );
}

function riskScoreColor(score: number): string {
  if (score >= 9) return 'bg-[#f8514933] text-[#f85149]';
  if (score >= 7) return 'bg-[#f8514933] text-[#f85149]';
  if (score >= 4) return 'bg-[#d2992233] text-[#d29922]';
  return 'bg-[#3fb95033] text-[#3fb950]';
}

function factorColor(score: number): string {
  if (score >= 2) return 'text-[#f85149]';
  if (score >= 1) return 'text-[#d29922]';
  return 'text-[#3fb950]';
}

function trendArrow(trend: 'rising' | 'falling' | 'stable'): { arrow: string; color: string } {
  if (trend === 'rising') return { arrow: '↑', color: 'text-[#f85149]' };
  if (trend === 'falling') return { arrow: '↓', color: 'text-[#3fb950]' };
  return { arrow: '→', color: 'text-[#d29922]' };
}

function NoDataMessage() {
  return (
    <div className="text-xs text-[#484f58] text-center py-4">
      분석 데이터가 없습니다
    </div>
  );
}

// ── Risk Tab ──

function RiskTab({ ruleEngine, ai }: { ruleEngine: RuleEngineResults | null; ai: AIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;

  const risk = ruleEngine.riskScore;
  const sr = ruleEngine.supportResistance;

  return (
    <>
      {/* Risk Score Card */}
      <Card>
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[13px] font-semibold">리스크 스코어</span>
          <span className={`${riskScoreColor(risk.totalScore)} px-2.5 py-0.5 rounded-xl text-[13px] font-bold`}>
            {risk.totalScore}/10
          </span>
        </div>

        {/* Individual risk factors */}
        <div className="text-[11px] space-y-0">
          <RiskFactorRow label="Leverage Risk" score={risk.leverageRisk} />
          <RiskFactorRow label="Liquidation Risk" score={risk.liquidationRisk} />
          <RiskFactorRow label="Volatility Risk" score={risk.volatilityRisk} />
          <RiskFactorRow label="Funding Crowd Risk" score={risk.fundingCrowdRisk} />
          <RiskFactorRow label="Concentration Risk" score={risk.concentrationRisk} last />
        </div>

        {ai?.riskInterpretation && <InterpretationBox text={ai.riskInterpretation} />}
      </Card>

      {/* Support / Resistance Card */}
      <Card>
        <SectionLabel>📍 Support / Resistance</SectionLabel>
        <div className="text-[11px] leading-[1.7] text-[#8b949e]">
          <SRRow label="Short-Term High" value={sr.shortTermHigh} color="text-[#f85149]" />
          <SRRow label="Short-Term Low" value={sr.shortTermLow} color="text-[#3fb950]" />
          <SRRow label="VWAP" value={sr.vwap} color="text-[#c9d1d9]" />
          <SRRow label="Pivot R1" value={sr.pivotR1} color="text-[#f85149]" />
          <SRRow label="Pivot S1" value={sr.pivotS1} color="text-[#3fb950]" />
        </div>
        {ai?.srInterpretation && <InterpretationBox text={ai.srInterpretation} />}
      </Card>
    </>
  );
}

function RiskFactorRow({ label, score, last }: { label: string; score: number; last?: boolean }) {
  return (
    <div className={`flex justify-between py-[3px] ${last ? '' : 'border-b border-[#21262d]'}`}>
      <span className="text-[#8b949e]">{label}</span>
      <span className={`${factorColor(score)} font-semibold`}>{score}/2</span>
    </div>
  );
}

function SRRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={color}>${value.toLocaleString()}</span>
    </div>
  );
}

// ── Funding Tab ──

function FundingTab({ ruleEngine, ai }: { ruleEngine: RuleEngineResults | null; ai: AIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;

  const f = ruleEngine.funding;
  const rateColor = f.currentRate > 0
    ? (Math.abs(f.currentRate) >= 0.05 ? 'text-[#f85149]' : 'text-[#d29922]')
    : 'text-[#3fb950]';
  const isExtreme = Math.abs(f.currentRate) >= 0.1;

  const t1 = trendArrow(f.trend1h);
  const t4 = trendArrow(f.trend4h);
  const t24 = trendArrow(f.trend24h);

  return (
    <Card>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[13px] font-semibold">펀딩 분석</span>
        <span className={`${rateColor} text-[13px] font-semibold`}>
          {f.currentRate >= 0 ? '+' : ''}{f.currentRate.toFixed(4)}%
        </span>
      </div>

      <div className="text-[11px] mb-2">
        <div className="flex justify-between py-[3px] border-b border-[#21262d]">
          <span className="text-[#8b949e]">1h Trend</span>
          <span className={t1.color}>{t1.arrow} {f.trend1h}</span>
        </div>
        <div className="flex justify-between py-[3px] border-b border-[#21262d]">
          <span className="text-[#8b949e]">4h Trend</span>
          <span className={t4.color}>{t4.arrow} {f.trend4h}</span>
        </div>
        <div className="flex justify-between py-[3px] border-b border-[#21262d]">
          <span className="text-[#8b949e]">24h Trend</span>
          <span className={t24.color}>{t24.arrow} {f.trend24h}</span>
        </div>
        <div className="flex justify-between py-[3px]">
          <span className="text-[#8b949e]">Z-Score</span>
          <span className={`font-semibold ${Math.abs(f.zScore) >= 2 ? 'text-[#f85149]' : 'text-[#c9d1d9]'}`}>
            {f.zScore >= 0 ? '+' : ''}{f.zScore.toFixed(1)}σ
          </span>
        </div>
      </div>

      {/* Extreme funding warning */}
      {isExtreme && (
        <div className="bg-[#f8514915] border border-[#f8514944] rounded-md p-2 mb-2">
          <div className="text-[11px] text-[#f85149] font-semibold">⚠ 극단 펀딩 경고</div>
          <div className="text-[11px] text-[#8b949e] mt-0.5">
            {f.extremeSignal ?? '펀딩 레이트가 극단 수준입니다'}
          </div>
        </div>
      )}

      {/* Mean Reversion */}
      <div className="text-[12px] text-[#8b949e]">
        📌 Mean Reversion: 평균 회귀 가능성 <span className="font-semibold text-[#c9d1d9]">{f.meanReversionProbability}</span>
      </div>

      {ai?.fundingInterpretation && <InterpretationBox text={ai.fundingInterpretation} />}
    </Card>
  );
}

// ── OI Tab ──

function OITab({ ruleEngine, ai }: { ruleEngine: RuleEngineResults | null; ai: AIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;

  const oi = ruleEngine.openInterest;
  const oiColor = oi.oiChangePercent >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]';
  const priceDir = oi.priceChangePercent >= 0 ? '↑' : '↓';
  const oiDir = oi.oiChangePercent >= 0 ? '↑' : '↓';

  return (
    <Card>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[13px] font-semibold">OI 분석</span>
        <span className={`${oiColor} text-[13px] font-semibold`}>
          {oi.oiChangePercent >= 0 ? '+' : ''}{oi.oiChangePercent.toFixed(2)}%
        </span>
      </div>

      {/* Direction badges */}
      <div className="flex gap-2 mb-2.5">
        <span className={`text-[11px] px-2 py-0.5 rounded ${
          oi.priceChangePercent >= 0 ? 'bg-[#3fb95022] text-[#3fb950]' : 'bg-[#f8514922] text-[#f85149]'
        }`}>
          가격 {priceDir}
        </span>
        <span className={`text-[11px] px-2 py-0.5 rounded ${
          oi.oiChangePercent >= 0 ? 'bg-[#3fb95022] text-[#3fb950]' : 'bg-[#f8514922] text-[#f85149]'
        }`}>
          OI {oiDir}
        </span>
      </div>

      {/* Scenario */}
      <div className="text-[12px] text-[#c9d1d9] mb-2">
        📊 시나리오: <span className="font-semibold">{oi.scenario}</span>
      </div>

      {/* OI Spike */}
      {oi.isSpike && (
        <div className="bg-[#d2992215] border border-[#d2992244] rounded-md p-2 mb-2">
          <div className="text-[11px] text-[#d29922] font-semibold">⚡ OI Spike 감지</div>
          <div className="text-[11px] text-[#8b949e] mt-0.5">
            OI 변화율 {Math.abs(oi.oiChangePercent).toFixed(2)}% — 5% 임계값 초과
          </div>
        </div>
      )}

      {ai?.oiInterpretation && <InterpretationBox text={ai.oiInterpretation} />}
    </Card>
  );
}

// ── Liquidation Tab ──

function LiquidationTab({ ruleEngine, ai }: { ruleEngine: RuleEngineResults | null; ai: AIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;

  const liq = ruleEngine.liquidation;

  return (
    <Card>
      <div className="text-[13px] font-semibold mb-2.5">청산 클러스터</div>

      {/* Nearby warning */}
      {liq.nearbyWarning && (
        <div className="bg-[#f8514915] border border-[#f8514944] rounded-md p-2 mb-2.5">
          <div className="text-[11px] text-[#f85149] font-semibold">
            ⚠ 근접 청산 경고
          </div>
          <div className="text-[11px] text-[#8b949e] mt-0.5">
            {liq.nearbyClusterSide === 'both'
              ? '롱/숏 양쪽 청산 클러스터가 근접해 있습니다'
              : liq.nearbyClusterSide === 'long'
                ? '롱 청산 클러스터가 근접해 있습니다'
                : '숏 청산 클러스터가 근접해 있습니다'}
          </div>
        </div>
      )}

      {/* Long clusters */}
      <SectionLabel>🔴 롱 청산 클러스터</SectionLabel>
      {liq.longClusters.length === 0 ? (
        <div className="text-[11px] text-[#484f58] mb-2">데이터 없음</div>
      ) : (
        <div className="text-[11px] mb-2.5 space-y-1">
          {liq.longClusters.map((c, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-[#f85149]">${c.priceLevel.toLocaleString()}</span>
              <span className="text-[#8b949e]">{c.distancePercent.toFixed(2)}% 거리</span>
            </div>
          ))}
        </div>
      )}

      {/* Short clusters */}
      <SectionLabel>🟢 숏 청산 클러스터</SectionLabel>
      {liq.shortClusters.length === 0 ? (
        <div className="text-[11px] text-[#484f58] mb-2">데이터 없음</div>
      ) : (
        <div className="text-[11px] mb-2.5 space-y-1">
          {liq.shortClusters.map((c, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-[#3fb950]">${c.priceLevel.toLocaleString()}</span>
              <span className="text-[#8b949e]">{c.distancePercent.toFixed(2)}% 거리</span>
            </div>
          ))}
        </div>
      )}

      {ai?.liquidationInterpretation && <InterpretationBox text={ai.liquidationInterpretation} />}
    </Card>
  );
}

// ── Suggest Tab ──

function SuggestTab({ ruleEngine, ai }: { ruleEngine: RuleEngineResults | null; ai: AIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;

  const risk = ruleEngine.riskScore;
  const funding = ruleEngine.funding;
  const oi = ruleEngine.openInterest;
  const liq = ruleEngine.liquidation;

  // Build rule engine summary bullets
  const bullets: string[] = [];
  bullets.push(`리스크 스코어: ${risk.totalScore}/10`);
  if (risk.leverageRisk >= 2) bullets.push('⚠ 레버리지 위험 높음');
  if (Math.abs(funding.currentRate) >= 0.05) {
    bullets.push(`⚡ 펀딩 레이트 ${funding.currentRate >= 0 ? '+' : ''}${funding.currentRate.toFixed(4)}%`);
  }
  bullets.push(`📊 OI 시나리오: ${oi.scenario}`);
  if (liq.nearbyWarning) bullets.push('🚨 근접 청산 클러스터 경고');

  return (
    <>
      {/* AI Overall Summary */}
      {ai?.overallSummary && (
        <Card>
          <SectionLabel>🤖 AI 종합 분석</SectionLabel>
          <div className="text-[12px] leading-[1.8] text-[#c9d1d9] whitespace-pre-wrap">
            {ai.overallSummary}
          </div>
        </Card>
      )}

      {/* Rule Engine Summary */}
      <Card>
        <SectionLabel>📋 Rule Engine 요약</SectionLabel>
        <div className="text-[11px] space-y-1">
          {bullets.map((b, i) => (
            <div key={i} className="text-[#8b949e]">{b}</div>
          ))}
        </div>
      </Card>
    </>
  );
}