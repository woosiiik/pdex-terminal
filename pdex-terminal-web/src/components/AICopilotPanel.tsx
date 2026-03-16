'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/stores/useStore';
import type {
  AIInterpretation,
  RuleEngineResults,
  OrderAnalysisRuleEngineResults,
  OrderAnalysisAIInterpretation,
} from '@/lib/types';

type PositionTabId = 'risk' | 'funding' | 'oi' | 'liq' | 'suggest';
type OrderTabId = 'order-strategy' | 'order-execution' | 'order-concentration' | 'order-impact' | 'order-suggest' | 'order-change';

const POSITION_TABS: { id: PositionTabId; label: string; tooltip: string }[] = [
  { id: 'risk', label: '리스크', tooltip: '레버리지, 청산거리, 변동성, 펀딩, 집중도를 종합한 위험도 점수 (0~10)' },
  { id: 'funding', label: '펀딩', tooltip: '현재 펀딩 레이트와 추세, Z-Score 기반 평균 회귀 가능성 분석' },
  { id: 'oi', label: 'OI', tooltip: 'Open Interest 변화와 가격 변화를 조합한 시장 포지션 시나리오 분석' },
  { id: 'liq', label: '청산', tooltip: '현재가 근처의 롱/숏 청산 클러스터 분포 및 근접 경고' },
  { id: 'suggest', label: '제안', tooltip: 'Rule Engine + AI 종합 분석 결과 요약 및 제안' },
];

const ORDER_TABS: { id: OrderTabId; label: string; tooltip: string }[] = [
  { id: 'order-strategy', label: '전략', tooltip: '주문 가격 분포와 방향성 기반 트레이딩 전략 패턴 탐지' },
  { id: 'order-execution', label: '체결', tooltip: '현재 시장가 대비 주문 가격 거리 기반 체결 가능성 평가' },
  { id: 'order-concentration', label: '집중도', tooltip: '특정 가격대 주문 밀집 구간 탐지 및 전략적 의미 분석' },
  { id: 'order-impact', label: '영향', tooltip: '미체결 주문이 현재 포지션 리스크에 미치는 영향 분석' },
  { id: 'order-suggest', label: '제안', tooltip: '오더 분석 종합 요약 및 제안' },
  { id: 'order-change', label: '변경', tooltip: '주문 수정/취소/재배치 이벤트 기반 전략 변경 탐지 (준비 중)' },
];

export default function AICopilotPanel() {
  const [positionTab, setPositionTab] = useState<PositionTabId>('risk');
  const [orderTab, setOrderTab] = useState<OrderTabId>('order-strategy');
  const positionAnalysis = useStore((s) => s.positionAnalysis);
  const orderAnalysis = useStore((s) => s.orderAnalysis);
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

  // Order mode
  if (selectedMode === 'order') {
    if (analysisLoading) {
      return (
        <div className="flex flex-col h-full">
          <TabHeader tabs={ORDER_TABS} activeTab={orderTab} onTabChange={setOrderTab} />
          <div className="flex-1 p-3 space-y-3">
            <LoadingSkeleton />
          </div>
        </div>
      );
    }

    const orderRE = orderAnalysis?.ruleEngine ?? null;
    const orderAI = orderAnalysis?.aiInterpretation ?? null;

    return (
      <div className="flex flex-col h-full">
        <TabHeader tabs={ORDER_TABS} activeTab={orderTab} onTabChange={setOrderTab} />
        <div className="flex-1 p-3 overflow-y-auto">
          {orderTab === 'order-strategy' && <OrderStrategyTab ruleEngine={orderRE} ai={orderAI} />}
          {orderTab === 'order-execution' && <OrderExecutionTab ruleEngine={orderRE} ai={orderAI} />}
          {orderTab === 'order-concentration' && <OrderClusterTab ruleEngine={orderRE} ai={orderAI} />}
          {orderTab === 'order-impact' && <OrderImpactTab ruleEngine={orderRE} ai={orderAI} />}
          {orderTab === 'order-suggest' && <OrderSuggestTab ruleEngine={orderRE} ai={orderAI} />}
          {orderTab === 'order-change' && <OrderChangeComingSoon />}
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

// ── Suggest Tab ──

function TabHeader<T extends string>({ tabs, activeTab, onTabChange }: { tabs: { id: T; label: string; tooltip?: string }[]; activeTab: T; onTabChange: (t: T) => void }) {
  const compact = tabs.length > 5;
  return (
    <div className="flex bg-[#161b22] border-b border-[#30363d] shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          title={tab.tooltip}
          className={`${compact ? 'px-2' : 'px-4'} py-2.5 text-xs cursor-pointer border-b-2 transition-colors whitespace-nowrap ${
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

// ── Inline Tooltip ──

function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleEnter = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShow(true);
  }, []);

  const handleLeave = useCallback(() => setShow(false), []);

  return (
    <span
      ref={ref}
      className="cursor-help"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {show && typeof document !== 'undefined' && createPortal(
        <div
          style={{ left: pos.x, top: pos.y }}
          className="fixed -translate-x-1/2 -translate-y-full pointer-events-none px-2.5 py-1.5 mb-1.5 rounded-md bg-[#1c2128] border border-[#30363d] text-[10px] leading-[1.5] text-[#c9d1d9] w-[200px] text-center z-[9999] shadow-lg"
        >
          {text}
        </div>,
        document.body,
      )}
    </span>
  );
}

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
          <RiskFactorRow label="Leverage Risk" score={risk.leverageRisk} tip="레버리지 배수 기반 위험도. 10x 이상이면 높음" />
          <RiskFactorRow label="Liquidation Risk" score={risk.liquidationRisk} tip="현재가 대비 청산가 거리. 가까울수록 위험" />
          <RiskFactorRow label="Volatility Risk" score={risk.volatilityRisk} tip="24시간 변동성(ATR) 기반 위험도" />
          <RiskFactorRow label="Funding Crowd Risk" score={risk.fundingCrowdRisk} tip="펀딩 레이트가 극단적일 때 군중 반대 포지션 위험" />
          <RiskFactorRow label="Concentration Risk" score={risk.concentrationRisk} tip="단일 포지션 마진 비중이 높을수록 위험" last />
        </div>

        {ai?.riskInterpretation && <InterpretationBox text={ai.riskInterpretation} />}
      </Card>

      {/* Support / Resistance Card */}
      <Card>
        <SectionLabel>📍 Support / Resistance</SectionLabel>
        <div className="text-[11px] leading-[1.7] text-[#8b949e]">
          <SRRow label="Short-Term High" value={sr.shortTermHigh} color="text-[#f85149]" tip="7일 1시간봉 기준 단기 저항선" />
          <SRRow label="Short-Term Low" value={sr.shortTermLow} color="text-[#3fb950]" tip="7일 1시간봉 기준 단기 지지선" />
          <SRRow label="VWAP" value={sr.vwap} color="text-[#c9d1d9]" tip="거래량 가중 평균 가격. 기관 매매 기준점" />
          <SRRow label="Pivot R1" value={sr.pivotR1} color="text-[#f85149]" tip="피봇 포인트 기반 1차 저항선" />
          <SRRow label="Pivot S1" value={sr.pivotS1} color="text-[#3fb950]" tip="피봇 포인트 기반 1차 지지선" />
        </div>
        {ai?.srInterpretation && <InterpretationBox text={ai.srInterpretation} />}
      </Card>
    </>
  );
}

function RiskFactorRow({ label, score, last, tip }: { label: string; score: number; last?: boolean; tip?: string }) {
  return (
    <div className={`flex justify-between py-[3px] ${last ? '' : 'border-b border-[#21262d]'}`}>
      <span className="text-[#8b949e]">{tip ? <Tip text={tip}>{label} ⓘ</Tip> : label}</span>
      <span className={`${factorColor(score)} font-semibold`}>{score}/2</span>
    </div>
  );
}

function SRRow({ label, value, color, tip }: { label: string; value: number; color: string; tip?: string }) {
  return (
    <div className="flex justify-between">
      <span>{tip ? <Tip text={tip}>{label} ⓘ</Tip> : label}</span>
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
          <span className="text-[#8b949e]"><Tip text="최근 1시간 펀딩 레이트 추세">1h Trend ⓘ</Tip></span>
          <span className={t1.color}>{t1.arrow} {f.trend1h}</span>
        </div>
        <div className="flex justify-between py-[3px] border-b border-[#21262d]">
          <span className="text-[#8b949e]"><Tip text="최근 4시간 펀딩 레이트 추세">4h Trend ⓘ</Tip></span>
          <span className={t4.color}>{t4.arrow} {f.trend4h}</span>
        </div>
        <div className="flex justify-between py-[3px] border-b border-[#21262d]">
          <span className="text-[#8b949e]"><Tip text="최근 24시간 펀딩 레이트 추세">24h Trend ⓘ</Tip></span>
          <span className={t24.color}>{t24.arrow} {f.trend24h}</span>
        </div>
        <div className="flex justify-between py-[3px]">
          <span className="text-[#8b949e]"><Tip text="30일 평균 대비 현재 펀딩 레이트의 표준편차. ±2σ 이상이면 극단">Z-Score ⓘ</Tip></span>
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
        📌 <Tip text="펀딩 레이트가 평균으로 돌아갈 확률. Z-Score 기반 계산">Mean Reversion ⓘ</Tip>: 평균 회귀 가능성 <span className="font-semibold text-[#c9d1d9]">{f.meanReversionProbability}</span>
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
        📊 <Tip text="OI 증감 + 가격 증감 조합으로 판단. 신규 진입/청산 여부와 추세 방향을 나타냄">시나리오 ⓘ</Tip>: <span className="font-semibold">{oi.scenario}</span>
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

// ============================================================
// Order Analysis Tabs
// ============================================================

const STRATEGY_LABELS: Record<string, string> = {
  grid: '그리드 트레이딩',
  range: '레인지 트레이딩',
  breakout: '돌파 전략',
  accumulation: '매집 전략',
  unknown: '미탐지',
};

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: '높음', color: 'bg-[#3fb95033] text-[#3fb950]' },
  medium: { label: '보통', color: 'bg-[#d2992233] text-[#d29922]' },
  low: { label: '낮음', color: 'bg-[#f8514933] text-[#f85149]' },
};

const PROB_COLORS: Record<string, string> = {
  high: 'text-[#3fb950]',
  medium: 'text-[#d29922]',
  low: 'text-[#f85149]',
};

const PURPOSE_LABELS: Record<string, { label: string; icon: string }> = {
  take_profit: { label: '익절', icon: '💰' },
  stop_loss: { label: '손절', icon: '🛑' },
  hedging: { label: '헤지', icon: '🛡️' },
  position_expansion: { label: '추가 진입', icon: '📈' },
  new_entry: { label: '신규 진입', icon: '🆕' },
};

// ── Order Strategy Tab ──

function OrderStrategyTab({ ruleEngine, ai }: { ruleEngine: OrderAnalysisRuleEngineResults | null; ai: OrderAnalysisAIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;
  const s = ruleEngine.strategy;
  const conf = CONFIDENCE_LABELS[s.confidence];

  return (
    <Card>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[13px] font-semibold">전략 탐지</span>
        <span className={`${conf.color} px-2.5 py-0.5 rounded-xl text-[11px] font-semibold`}>
          {STRATEGY_LABELS[s.detectedStrategy]}
        </span>
      </div>
      <div className="text-[12px] text-[#c9d1d9] mb-2">{s.description}</div>
      <div className="text-[11px] space-y-0">
        <div className="flex justify-between py-[3px] border-b border-[#21262d]">
          <span className="text-[#8b949e]"><Tip text="현재 미체결 주문 총 개수">주문 수 ⓘ</Tip></span>
          <span className="text-[#c9d1d9]">{s.orderCount}개</span>
        </div>
        <div className="flex justify-between py-[3px] border-b border-[#21262d]">
          <span className="text-[#8b949e]"><Tip text="매수/매도 주문 비율. 방향성 편향 판단 기준">매수 / 매도 ⓘ</Tip></span>
          <span className="text-[#c9d1d9]">{s.buyCount} / {s.sellCount}</span>
        </div>
        <div className="flex justify-between py-[3px] border-b border-[#21262d]">
          <span className="text-[#8b949e]"><Tip text="주문이 분포된 최저~최고 가격. 전략 범위 파악">가격 범위 ⓘ</Tip></span>
          <span className="text-[#c9d1d9]">${s.priceRange.min.toLocaleString()} ~ ${s.priceRange.max.toLocaleString()}</span>
        </div>
        <div className="flex justify-between py-[3px]">
          <span className="text-[#8b949e]"><Tip text="전략 패턴 매칭 신뢰도. 주문 수와 분포 균일성 기반">신뢰도 ⓘ</Tip></span>
          <span className={conf.color.split(' ')[1]}>{conf.label}</span>
        </div>
      </div>
      {ai?.strategyInterpretation && <InterpretationBox text={ai.strategyInterpretation} />}
    </Card>
  );
}

// ── Order Execution Tab ──

function OrderExecutionTab({ ruleEngine, ai }: { ruleEngine: OrderAnalysisRuleEngineResults | null; ai: OrderAnalysisAIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;
  const ep = ruleEngine.executionProbability;

  return (
    <>
      <Card>
        <div className="text-[13px] font-semibold mb-2.5">체결 가능성 요약</div>
        <div className="flex gap-2 mb-2.5">
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#3fb95022] text-[#3fb950]">High {ep.highCount}</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#d2992222] text-[#d29922]">Medium {ep.mediumCount}</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#f8514922] text-[#f85149]">Low {ep.lowCount}</span>
        </div>
        <div className="text-[11px] space-y-0.5">
          {ep.items.map((item, i) => (
            <div key={i} className="flex justify-between py-[3px] border-b border-[#21262d] last:border-0">
              <span className="text-[#8b949e]">
                <Tip text={`현재가 대비 ${Math.abs(item.distancePercent).toFixed(1)}% ${item.distancePercent >= 0 ? '위' : '아래'}. 거리가 가까울수록 체결 가능성 높음`}>
                  {item.side === 'buy' ? '매수' : '매도'} ${item.price.toLocaleString()} ⓘ
                </Tip>
              </span>
              <span className={PROB_COLORS[item.probability]}>
                {item.distancePercent >= 0 ? '+' : ''}{item.distancePercent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
        {ai?.executionInterpretation && <InterpretationBox text={ai.executionInterpretation} />}
      </Card>
    </>
  );
}

// ── Order Cluster Tab ──

function OrderClusterTab({ ruleEngine, ai }: { ruleEngine: OrderAnalysisRuleEngineResults | null; ai: OrderAnalysisAIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;
  const oc = ruleEngine.orderClusters;

  const CLUSTER_LABELS: Record<string, string> = {
    sell_wall: '매도벽',
    accumulation_zone: '매집 구간',
    distribution_zone: '분배 구간',
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[13px] font-semibold">주문 집중도</span>
        <span className="text-[11px] text-[#8b949e]">
          <Tip text="매수/매도 주문 볼륨 비교. 한쪽이 60% 이상이면 우세로 판단">우세 ⓘ</Tip>: {oc.dominantSide === 'buy' ? '매수' : oc.dominantSide === 'sell' ? '매도' : '균형'}
        </span>
      </div>
      {oc.clusters.length === 0 ? (
        <div className="text-[11px] text-[#484f58]">집중 구간 없음 (2개 이상 주문 밀집 필요)</div>
      ) : (
        <div className="text-[11px] space-y-2">
          {oc.clusters.map((c, i) => (
            <div key={i} className="bg-[#0d1117] rounded p-2">
              <div className="flex justify-between mb-1">
                <span className="text-[#c9d1d9] font-semibold">${c.priceLevel.toLocaleString()}</span>
                <span className={c.side === 'buy' ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                  <Tip text={c.clusterType === 'sell_wall' ? '대량 매도 주문이 집중된 저항 구간' : c.clusterType === 'accumulation_zone' ? '매수 주문이 집중된 매집 구간' : '매도 주문이 분산 배치된 분배 구간'}>
                    {CLUSTER_LABELS[c.clusterType]} ⓘ
                  </Tip>
                </span>
              </div>
              <div className="flex justify-between text-[#8b949e]">
                <span>{c.orderCount}개 주문</span>
                <span>{c.distancePercent >= 0 ? '+' : ''}{c.distancePercent.toFixed(1)}% 거리</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {ai?.clusterInterpretation && <InterpretationBox text={ai.clusterInterpretation} />}
    </Card>
  );
}

// ── Order Impact Tab ──

function OrderImpactTab({ ruleEngine, ai }: { ruleEngine: OrderAnalysisRuleEngineResults | null; ai: OrderAnalysisAIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;
  const pi = ruleEngine.positionImpact;

  return (
    <>
      <Card>
        <div className="text-[13px] font-semibold mb-2.5">포지션 영향</div>
        <div className="flex gap-2 mb-2.5">
          {pi.hasRiskReduction && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#3fb95022] text-[#3fb950]">리스크 감소</span>
          )}
          {pi.hasRiskIncrease && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#f8514922] text-[#f85149]">리스크 증가</span>
          )}
          {!pi.hasRiskReduction && !pi.hasRiskIncrease && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#30363d] text-[#8b949e]">영향 없음</span>
          )}
        </div>
        <div className="text-[11px] space-y-1.5">
          {pi.items.map((item, i) => {
            const p = PURPOSE_LABELS[item.purpose] ?? { label: item.purpose, icon: '📋' };
            const purposeTips: Record<string, string> = {
              take_profit: '수익 실현을 위한 반대 방향 주문',
              stop_loss: '손실 제한을 위한 반대 방향 주문',
              hedging: '기존 포지션 리스크를 상쇄하는 주문',
              position_expansion: '기존 포지션과 같은 방향 추가 진입',
              new_entry: '포지션이 없는 상태에서의 신규 진입',
            };
            return (
              <div key={i} className="flex items-start gap-1.5 py-1 border-b border-[#21262d] last:border-0">
                <span>{p.icon}</span>
                <div className="flex-1">
                  <div className="text-[#c9d1d9]">{item.description}</div>
                  <div className="text-[#484f58] text-[10px]">
                    {item.orderSide === 'buy' ? '매수' : '매도'} ${item.orderPrice.toLocaleString()} × {item.orderSize}
                  </div>
                </div>
                <span className="text-[10px] text-[#8b949e] shrink-0">
                  <Tip text={purposeTips[item.purpose] ?? '주문 목적 분류'}>{p.label} ⓘ</Tip>
                </span>
              </div>
            );
          })}
        </div>
        {ai?.impactInterpretation && <InterpretationBox text={ai.impactInterpretation} />}
      </Card>
    </>
  );
}

// ── Order Suggest Tab ──

function OrderSuggestTab({ ruleEngine, ai }: { ruleEngine: OrderAnalysisRuleEngineResults | null; ai: OrderAnalysisAIInterpretation | null }) {
  if (!ruleEngine) return <NoDataMessage />;

  const s = ruleEngine.strategy;
  const ep = ruleEngine.executionProbability;
  const pi = ruleEngine.positionImpact;

  const bullets: string[] = [];
  bullets.push(`🎯 전략: ${STRATEGY_LABELS[s.detectedStrategy]} (${CONFIDENCE_LABELS[s.confidence].label})`);
  bullets.push(`📊 주문: 매수 ${s.buyCount}개, 매도 ${s.sellCount}개`);
  if (ep.lowCount > 0) bullets.push(`⚠ 체결 가능성 낮은 주문 ${ep.lowCount}개`);
  if (pi.hasRiskReduction) bullets.push('✅ 리스크 감소 주문 포함');
  if (pi.hasRiskIncrease) bullets.push('🔺 리스크 증가 주문 포함');

  return (
    <>
      {ai?.overallSummary && (
        <Card>
          <SectionLabel>🤖 AI 종합 분석</SectionLabel>
          <div className="text-[12px] leading-[1.8] text-[#c9d1d9] whitespace-pre-wrap">
            {ai.overallSummary}
          </div>
        </Card>
      )}
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


// ── Order Change Coming Soon ──

function OrderChangeComingSoon() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-2xl mb-2">🚧</div>
        <div className="text-[13px] font-semibold text-[#c9d1d9] mb-1">전략 변경 탐지</div>
        <div className="text-[11px] text-[#484f58] leading-[1.6]">
          주문 수정/취소/재배치 이벤트 기반<br />전략 변경 탐지 기능을 준비 중입니다
        </div>
      </div>
    </Card>
  );
}
