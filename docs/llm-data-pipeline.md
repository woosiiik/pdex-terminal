# LLM 데이터 파이프라인

LLM에 분석을 요청할 때 어떤 데이터가 수집되고, 어떻게 가공되어 전달되는지를 정리한 문서.

---

## 1. 포지션 분석 (Position Analysis)

사용자가 포지션 카드를 클릭하면 해당 코인에 대해 LLM 2회 호출이 발생한다.

### 1-1. Hyperliquid에서 가져오는 원시 데이터

| 데이터 | API | 설명 |
|--------|-----|------|
| 현재가 (markPx) | `allMids` | 코인의 현재 중간가 |
| 7일 1시간봉 캔들 | `candleSnapshot` (1h, 7일) | 단기 고/저가, S/R 계산용 |
| 30일 4시간봉 캔들 | `candleSnapshot` (4h, 30일) | 중기 고/저가 계산용 |
| 최근 1일봉 캔들 | `candleSnapshot` (1d, 1일) | VWAP, Pivot, 변동성 계산용 |
| 현재 펀딩 레이트 | `metaAndAssetCtxs` | 8시간 주기 펀딩 레이트 |
| 30일 펀딩 히스토리 | `fundingHistory` | 추세 분석, Z-Score 계산용 |
| Open Interest | `metaAndAssetCtxs` | 현재 미결제약정 |
| 이전 OI (DB) | `oi_history` 테이블 | OI 변화율 계산용 비교 데이터 |

### 1-2. Rule Engine이 가공한 데이터

| 모듈 | 입력 | 출력 | LLM에 전달되는 값 |
|------|------|------|-------------------|
| Risk Calculator | 포지션 정보, 현재가, 변동성, 펀딩 레이트 | `RiskScoreResult` | 총점(0~10), 레버리지/청산/변동성/펀딩군중/집중도 각 0~2 |
| S/R Calculator | 7일봉, 30일봉, 최근 캔들 | `SupportResistanceResult` | 7일 고/저, 30일 고/저, VWAP, Pivot Point, R1, S1 |
| Funding Analyzer | 현재 레이트, 1h/4h/24h/30d 히스토리 | `FundingAnalysisResult` | 현재 레이트, 1h/4h/24h 추세(rising/falling/stable), Z-Score, 평균회귀 확률, 극단 신호 |
| OI Analyzer | 현재 OI, 이전 OI, 현재가, 이전가 | `OIAnalysisResult` | OI 변화율(%), 가격 변화율(%), 시나리오(4종), Spike 여부 |
| Liquidation Analyzer | 현재가, 포지션 청산가 목록 | `LiquidationClusterResult` | 롱/숏 클러스터 목록(가격, 거리%), 근접 경고 |

### 1-3. LLM에 전달되는 프롬프트 구조

```
[시스템] 암호화폐 무기한 선물 거래 전문 분석가 역할

[사용자] {symbol} 포지션 종합 분석 데이터:
  - Risk Score: 총점, 5개 세부 항목
  - Support/Resistance: 7일/30일 고저, VWAP, Pivot R1/S1
  - Funding: 현재 레이트, 1h/4h/24h 추세, Z-Score, 평균회귀
  - OI: 변화율, 가격변화, 시나리오, Spike 여부
  - Liquidation: 롱/숏 클러스터 수, 근접 경고

→ JSON 응답: riskInterpretation, srInterpretation, fundingInterpretation,
             oiInterpretation, liquidationInterpretation, overallSummary
```

### 1-4. 전략 조언 (2번째 LLM 호출)

포지션 해석 후 추가로 TP/SL 전략을 요청한다.

```
[시스템] 암호화폐 무기한 선물 거래 전문 전략가 역할

[사용자] {symbol} {side} 포지션 전략 요청:
  - 포지션 정보: 진입가, 현재가, 레버리지, 사이즈, 미실현 PnL%
  - Rule Engine 결과: 리스크 스코어, S/R, 펀딩, OI 시나리오

→ JSON 응답: shortTerm(1~7일) / midTerm(8~21일) 각각 tp, sl, outlook, keyLevel, tip
```

---

## 2. 오더 분석 (Order Analysis)

사용자가 오더 카드를 클릭하면 해당 코인의 미체결 주문을 분석한다.

### 2-1. Hyperliquid에서 가져오는 원시 데이터

| 데이터 | API | 설명 |
|--------|-----|------|
| 현재가 | `allMids` | 체결 가능성 거리 계산 기준 |
| 최근 1일봉 캔들 | `candleSnapshot` (1d, 1일) | 24시간 변동성(ATR) 계산 |
| 현재 펀딩 레이트 | `metaAndAssetCtxs` | 전략 컨텍스트 보강 |
| L2 오더북 | `l2Book` | 유동성 분석, 체결 가능성 보정 |

### 2-2. Rule Engine이 가공한 데이터

| 모듈 | 입력 | 출력 | LLM에 전달되는 값 |
|------|------|------|-------------------|
| Strategy Detector | 주문 목록, 현재가, 시장 컨텍스트 | `StrategyDetectionResult` | 탐지 전략(grid/range/breakout/accumulation), 신뢰도, 매수/매도 수, 가격 범위 |
| Execution Probability | 주문 목록, 현재가, 변동성, L2북 | `ExecutionProbabilityResult` | 각 주문별 체결 확률(high/medium/low), 현재가 대비 거리% |
| Order Cluster Analyzer | 주문 목록, 현재가 | `OrderClusterResult` | 가격대별 주문 밀집 클러스터, 우세 방향(buy/sell/balanced) |
| Position Impact Analyzer | 주문 목록, 포지션 목록, 현재가 | `PositionImpactResult` | 각 주문의 목적(익절/손절/헤지/추가진입/신규), 리스크 증감 여부 |

### 2-3. LLM에 전달되는 프롬프트 구조

```
[시스템] 암호화폐 무기한 선물 거래 전문 분석가 역할

[사용자] {symbol} 오픈 오더 종합 분석 데이터:
  - 전략 탐지: 전략명, 신뢰도, 주문 수, 매수/매도 비율, 가격 범위
  - 체결 가능성: High/Medium/Low 각 개수
  - 주문 집중도: 클러스터 목록(가격, 유형, 거리%), 우세 방향
  - 포지션 영향: 리스크 감소/증가 여부, 각 주문의 목적과 설명

→ JSON 응답: strategyInterpretation, executionInterpretation,
             clusterInterpretation, impactInterpretation, overallSummary
```

---

## 3. 코인 추천 (Discover)

"AI 코인 추천" 버튼을 누르면 전체 시장 데이터를 LLM에 전달한다.

### 3-1. Hyperliquid에서 가져오는 원시 데이터

| 데이터 | API | 설명 |
|--------|-----|------|
| 전체 코인 메타데이터 | `metaAndAssetCtxs` | 코인명, 최대 레버리지 등 |
| 전체 코인 자산 컨텍스트 | `metaAndAssetCtxs` | markPx, prevDayPx, dayNtlVlm, funding, openInterest |

### 3-2. 서버에서 가공한 데이터

Rule Engine 모듈은 사용하지 않고, `buildMarketSummary()`로 직접 가공한다.

| 필드 | 계산 방식 |
|------|-----------|
| coin | 코인명 (BTC, ETH 등) |
| markPx | 현재 마크 가격 |
| changePercent24h | `(markPx - prevDayPx) / prevDayPx × 100` |
| dayNtlVlm | 24시간 거래량 (USD) |
| funding | 현재 펀딩 레이트 |
| openInterest | 미결제약정 |

거래량 > 0, 가격 > 0인 코인만 필터링 후 거래량 내림차순 정렬하여 전달.

### 3-3. LLM에 전달되는 프롬프트 구조

```
[시스템] 암호화폐 단기 트레이딩 추천 전문가 역할

[사용자] 현재 Hyperliquid 전체 {N}개 코인 마켓 데이터:

코인 | 현재가 | 24h변동률 | 24h거래량(M USD) | 펀딩레이트(%) | OI(M USD)
BTC  | 97000  | +2.35%   | 1234.5M          | 0.0100%       | 5678.9M
ETH  | 2100   | +1.20%   | 567.8M           | 0.0050%       | 1234.5M
...

→ JSON 배열 응답: 3~5개 코인, 각각 coin, direction(LONG/SHORT), tp, sl,
                  confidence(high/medium/low), reason
```

---

## 4. 데이터 흐름 요약

```
┌─────────────────────┐
│   Hyperliquid API   │
│  (allMids, candle,  │
│  funding, OI, L2)   │
└────────┬────────────┘
         │ 원시 데이터
         ▼
┌─────────────────────┐
│  Market Data Service │
│  (Redis 캐시 계층)   │
└────────┬────────────┘
         │ 캐시된 데이터
         ▼
┌─────────────────────┐
│    Rule Engine       │
│  (9개 분석 모듈)     │
│                      │
│  Risk Calculator     │
│  S/R Calculator      │
│  Funding Analyzer    │
│  OI Analyzer         │
│  Liquidation Analyzer│
│  Strategy Detector   │
│  Execution Prob.     │
│  Order Cluster       │
│  Position Impact     │
└────────┬────────────┘
         │ 정량 분석 결과
         ▼
┌─────────────────────┐
│   Prompt Builder     │
│  (시스템 + 사용자    │
│   프롬프트 조합)     │
└────────┬────────────┘
         │ 구조화된 프롬프트
         ▼
┌─────────────────────┐
│      LLM Client      │
│  Claude Sonnet 4     │
│  → Groq (Llama 3.3)  │
│  → Gemini 2.0 Flash  │
│  → OpenAI GPT-4o-mini│
└────────┬────────────┘
         │ JSON 응답
         ▼
┌─────────────────────┐
│   AI Engine          │
│  (JSON 파싱 + 검증)  │
│  → 프론트엔드 표시   │
│  → DB 저장           │
└─────────────────────┘
```
