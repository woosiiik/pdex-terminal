# AI Copilot 분석 요구사항 상세 — Open Position 분석

> 이 문서는 PDEX Terminal의 AI Copilot **Open Position(오픈 포지션) 분석** 기능에 대한 상세 요구사항과 설계 권장 사항을 정의한다.
> Open Order(미체결 주문) 분석은 [ai-copilot-order-analysis.md](./ai-copilot-order-analysis.md)를 참조한다.

## 목차

1. [포지션 리스크 분석 (Risk Analysis)](#1-포지션-리스크-분석-risk-analysis)
2. [Support / Resistance 처리](#2-support--resistance-처리)
3. [펀딩 레이트 분석 (Funding Analysis)](#3-펀딩-레이트-분석-funding-analysis)
4. [Open Interest 분석 (OI Analysis)](#4-open-interest-분석-oi-analysis)
5. [Liquidation Cluster 분석](#5-liquidation-cluster-분석)
6. [AI 역할 분리 아키텍처](#6-ai-역할-분리-아키텍처)
7. [분석 이력 저장](#7-분석-이력-저장)
8. [UI 툴팁](#8-ui-툴팁)
9. [전략 조언 (Strategy Advice)](#9-전략-조언-strategy-advice)

---

## 1. 포지션 리스크 분석 (Risk Analysis)

### 1.1 개요

사용자의 오픈 포지션에 대해 다차원 리스크를 자동 분석하여 0~10 척도의 Risk Score를 산출한다.

### 1.2 Risk Score 계산 모델

Risk Score는 다음 5가지 요소의 합산으로 산출한다 (각 요소 0~2점, 총 0~10점):

| 요소 | 설명 | 점수 범위 |
|------|------|-----------|
| Leverage Risk | 레버리지 배율에 따른 위험도 (10x 이상 높음) | 0~2 |
| Liquidation Risk | 청산가까지의 거리 기반 위험도 (현재가 대비 %) | 0~2 |
| Volatility Risk | 24시간 ATR 기반 변동성 위험도 | 0~2 |
| Funding Crowd Risk | 펀딩 레이트 극단 시 군중 반대 포지션 위험 | 0~2 |
| Position Concentration Risk | 전체 포트폴리오 대비 해당 포지션 마진 비중 | 0~2 |

#### 현재 구현 (risk-calculator.ts)

- Leverage Risk: leverage < 5 → 0, 5~10 → 1, >10 → 2
- Liquidation Risk: 청산가 거리 > 20% → 0, 10~20% → 1, <10% → 2
- Volatility Risk: ATR% < 3% → 0, 3~5% → 1, >5% → 2
- Funding Crowd Risk: |fundingRate| < 0.01% → 0, 0.01~0.05% → 1, >0.05% → 2
- Concentration Risk: 마진 비중 < 30% → 0, 30~60% → 1, >60% → 2

### 1.3 Risk Score 해석 기준

| 점수 범위 | 등급 | 설명 |
|-----------|------|------|
| 0~3 | 낮음 (Low) | 안정적인 포지션 |
| 4~6 | 보통 (Medium) | 주의 필요 |
| 7~8 | 높음 (High) | 리스크 관리 권장 |
| 9~10 | 매우 높음 (Critical) | 즉시 조치 권장 |

### 1.4 인수 조건

1. WHEN 오픈 포지션 데이터가 로드되면, THE Web_Service SHALL Analysis_Server에 포지션 리스크 분석을 요청한다
2. THE Analysis_Server SHALL 각 포지션에 대해 5가지 리스크 요소를 종합하여 0~10 척도의 Risk_Score를 산출한다
3. THE AI_Copilot SHALL 각 포지션의 Risk_Score, 개별 요소 점수, 해당 점수의 근거를 한국어로 표시한다
4. WHEN 포지션 데이터가 변경되면(selectedCoin 변경 시), THE Analysis_Server SHALL 리스크 분석을 재수행하고 갱신된 결과를 전달한다
5. IF Analysis_Server로부터 응답이 지연되면, THEN THE AI_Copilot SHALL "분석 중..." 로딩 스켈레톤을 표시한다

---

## 2. Support / Resistance 처리

### 2.1 설계 원칙

Support / Resistance 계산은 **AI가 아닌 룰 기반(Rule Engine)**으로 처리한다. AI는 계산된 결과에 대한 **해석만 수행**한다.

### 2.2 룰 기반 지표

| 지표 | 설명 | 데이터 소스 |
|------|------|-------------|
| 최근 7일 High / Low | 단기 지지/저항 | 1시간봉 캔들 |
| 최근 30일 High / Low | 중기 지지/저항 | 4시간봉 캔들 |
| VWAP | 거래량 가중 평균가 | 1시간봉 캔들 |
| Pivot Point / R1 / S1 | 피봇 포인트 기반 지지/저항 | 1일봉 캔들 |

### 2.3 현재 구현 (sr-calculator.ts)

- `shortTermHigh` / `shortTermLow`: 7일 1시간봉 기준
- `midTermHigh` / `midTermLow`: 30일 4시간봉 기준
- `vwap`: 7일 1시간봉 거래량 가중 평균
- `pivotPoint`: (High + Low + Close) / 3
- `pivotR1`: 2 × Pivot - Low
- `pivotS1`: 2 × Pivot - High

### 2.4 AI 해석 역할

- 현재 가격이 지지/저항선에 얼마나 근접한지 해석
- 돌파 또는 반등 가능성에 대한 코멘트 제공

---

## 3. 펀딩 레이트 분석 (Funding Analysis)

### 3.1 개요

펀딩 레이트의 추세, 평균 회귀 가능성, 극단 시그널을 분석하여 트레이딩 시그널을 제공한다.

### 3.2 분석 지표

| 지표 | 설명 |
|------|------|
| 1h Funding Trend | 최근 1시간 펀딩 추세 (rising / falling / stable) |
| 4h Funding Trend | 최근 4시간 펀딩 추세 |
| 24h Funding Trend | 최근 24시간 펀딩 추세 |
| Funding Z-Score | 현재 펀딩의 30일 평균 대비 표준편차 위치 |
| Mean Reversion Probability | Z-Score 기반 평균 회귀 가능성 (높음/보통/낮음) |

### 3.3 현재 구현 (funding-analyzer.ts)

- 추세 판별: 시간 윈도우 내 첫/마지막 레이트 비교, 변화율 기반 rising/falling/stable
- Z-Score: `(currentRate - mean30d) / stddev30d`
- Mean Reversion: |Z-Score| ≥ 2 → 높음, ≥ 1 → 보통, < 1 → 낮음
- Extreme Signal: |rate| ≥ 0.1% → 극단 펀딩 경고 문자열 생성

### 3.4 분석 시나리오

#### Mean Reversion (평균 회귀)
```
현재 funding: 0.06%
30일 평균:    0.01%

→ AI 해석: "극단적 롱 과밀 (extreme long crowd), 평균 회귀 가능성 높음"
```

#### Extreme Signal (극단 시그널)
- Funding Rate ≥ +0.1% → "극단 펀딩 경고: 롱 과밀"
- Funding Rate ≤ -0.1% → "극단 펀딩 경고: 숏 과밀"

### 3.5 인수 조건

1. WHEN 사용자가 코인을 선택하면, THE Web_Service SHALL Analysis_Server에 해당 코인의 펀딩 분석을 요청한다
2. THE Analysis_Server SHALL 1h/4h/24h 펀딩 추세와 Funding Z-Score를 산출한다
3. THE Analysis_Server SHALL 펀딩 추세(Funding Trend), 평균 회귀(Mean Reversion) 가능성, 극단 시그널(Extreme Signal)을 분석한다
4. THE AI_Copilot SHALL 현재 Funding_Rate 값, 추세 지표, AI 해석을 한국어로 표시한다
5. WHEN Funding_Rate가 ±0.1% 이상인 경우, THE AI_Copilot SHALL 해당 상태를 "극단 펀딩" 경고로 강조 표시한다

---

## 4. Open Interest 분석 (OI Analysis)

### 4.1 개요

Open Interest 변화와 가격 움직임의 관계를 분석하여 시장 참여자의 행동을 해석한다.

### 4.2 가격-OI 조합 시나리오

| 가격 변화 | OI 변화 | 해석 |
|-----------|---------|------|
| 가격 ↑ | OI ↑ | 신규 롱 진입, 추세 강화 |
| 가격 ↑ | OI ↓ | 숏 청산, 추세 약화 |
| 가격 ↓ | OI ↑ | 신규 숏 진입, 하락 추세 강화 |
| 가격 ↓ | OI ↓ | 롱 청산, 하락 추세 약화 |

### 4.3 현재 구현 (oi-analyzer.ts)

- 이전 OI 데이터는 MySQL `oi_history` 테이블에서 조회 (최근 2건)
- 최초 분석 시 이전 데이터가 없으면 현재 OI를 이전값으로 사용 (변화율 0%)
- OI 변화율과 가격 변화율의 부호 조합으로 4가지 시나리오 판별

### 4.4 OI Spike 감지

급격한 OI 변화를 감지하여 시장 이벤트를 알린다.

- **감지 조건**: OI 변화율 > 5%
- **AI 해석**: "대규모 신규 포지션 진입 감지"

### 4.5 인수 조건

1. WHEN 사용자가 코인을 선택하면, THE Web_Service SHALL Analysis_Server에 해당 코인의 Open_Interest 분석을 요청한다
2. THE Analysis_Server SHALL 가격 변화와 OI 변화의 조합을 분석하여 4가지 시나리오를 판별한다
3. THE Analysis_Server SHALL OI 변화율이 5% 이상인 경우 OI Spike로 감지한다
4. THE AI_Copilot SHALL 현재 OI 변화율, 시나리오 판별 결과, AI 해석을 한국어로 표시한다

---

## 5. Liquidation Cluster 분석

### 5.1 개요

주요 청산 가격대를 분석하여 가격 변동의 잠재적 트리거 포인트를 식별한다.

### 5.2 데이터 소스

현재 MVP에서는 외부 청산 데이터 API(Coinglass 등)를 사용하지 않고, **사용자의 오픈 포지션 청산가(liquidationPrice)**를 기반으로 클러스터를 생성한다.

| 항목 | 설명 |
|------|------|
| priceLevel | 포지션의 청산가 (liquidationPrice) |
| estimatedVolume | 포지션 규모 × 진입가 (size × entryPrice) |
| side | 포지션 방향 (long → 롱 청산 클러스터, short → 숏 청산 클러스터) |
| distancePercent | 현재가 대비 청산가 거리 (%) |

### 5.3 현재 구현 (liquidation-analyzer.ts + orchestrator)

```
[사용자 포지션] → positions.map(p => ({
  priceLevel: p.liquidationPrice,
  estimatedVolume: p.size * p.entryPrice,
  side: p.side
})) → analyzeLiquidationClusters(currentPrice, data)
```

- 롱 포지션의 청산가 → `longClusters`에 추가
- 숏 포지션의 청산가 → `shortClusters`에 추가
- 클러스터는 현재가 대비 거리순으로 정렬
- 근접 경고 임계값: ±2% (warningThreshold = 0.02)

### 5.4 근접 경고 조건

| 조건 | 결과 |
|------|------|
| 롱 클러스터가 현재가 ±2% 이내 | nearbyWarning = true, nearbyClusterSide = "long" |
| 숏 클러스터가 현재가 ±2% 이내 | nearbyWarning = true, nearbyClusterSide = "short" |
| 양쪽 모두 ±2% 이내 | nearbyWarning = true, nearbyClusterSide = "both" |

### 5.5 향후 개선 방향

- 외부 청산 데이터 API 연동 (Coinglass 등)으로 시장 전체 청산 클러스터 분석
- 현재는 사용자 본인 포지션만 반영되므로 시장 전체 청산 압력은 파악 불가

### 5.6 인수 조건

1. THE Analysis_Server SHALL 사용자 포지션의 청산가를 기반으로 롱/숏 청산 클러스터를 산출한다
2. THE AI_Copilot SHALL 청산 클러스터 위치와 현재 가격과의 거리(%)를 한국어로 표시한다
3. WHEN 청산 클러스터가 현재 가격의 ±2% 이내에 위치하면, THE AI_Copilot SHALL "근접 청산 경고"를 표시한다

---

## 6. AI 역할 분리 아키텍처

### 6.1 설계 원칙

분석 시스템은 **Rule Engine**과 **AI(LLM)**의 역할을 명확히 분리한다. AI가 실패해도 Rule Engine 결과는 독립적으로 표시된다.

### 6.2 역할 분담

| 컴포넌트 | 역할 | 처리 내용 |
|----------|------|-----------|
| Rule Engine | 계산 및 데이터 처리 | Risk Score 산출, S/R 계산, Funding Z-Score 계산, OI 시나리오 판별, Liquidation Cluster 산출 |
| AI (LLM) | 해석 및 설명 | 시장 상황 해석, 리스크 설명, 전략 코멘트, 종합 제안 생성 |

### 6.3 LLM 멀티 프로바이더 폴백 체인

AI 해석은 다음 순서로 LLM 프로바이더를 시도한다 (llm-client.ts):

```
Groq (llama-3.3-70b-versatile) → Gemini (gemini-2.0-flash) → OpenAI (gpt-4o-mini)
```

- Groq가 1순위 (무료, 빠름), Gemini와 OpenAI는 폴백
- 각 프로바이더 실패 시 다음 프로바이더로 자동 폴백
- 모든 프로바이더 실패 시 `aiInterpretation: null` 반환 (Rule Engine 결과만 표시)
- Groq는 OpenAI 호환 API 사용 (`baseURL: https://api.groq.com/openai/v1`)

### 6.4 처리 흐름

```
[Hyperliquid API] → [Market Data Service (+ Redis 캐시)]
                          ↓
                    [Rule Engine] → 수치/지표 산출
                          ↓
                    [AI Engine (LLM)] → 해석/설명/제안 생성 (실패 시 null)
                          ↓
                    [REST API] → JSON 응답
                          ↓
                    [AI Copilot UI] → 사용자에게 표시
```

### 6.5 인수 조건

1. THE Analysis_Server SHALL Rule Engine과 AI Engine을 분리된 모듈로 구현한다
2. THE Rule Engine SHALL 수치 계산, 지표 산출, 조건 판별을 담당한다
3. THE AI Engine SHALL Rule Engine의 산출 결과를 입력으로 받아 한국어 해석과 전략 코멘트를 생성한다
4. THE Rule Engine의 산출 결과는 AI Engine 없이도 독립적으로 조회 가능해야 한다
5. THE AI Engine SHALL LLM 프로바이더 실패 시 자동으로 다음 프로바이더로 폴백한다

---

## 7. 분석 이력 저장

### 7.1 개요

모든 분석 결과는 MySQL `analysis_history` 테이블에 저장된다 (fire-and-forget 방식).

### 7.2 저장 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| symbol | VARCHAR(20) | 분석 대상 코인 심볼 |
| analysis_type | VARCHAR(50) | 분석 유형 (position, funding, oi, liquidation) |
| rule_engine_result | JSON | Rule Engine 산출 결과 전체 |
| ai_interpretation | TEXT | AI 해석 결과 (nullable) |
| user_address | VARCHAR(42) | 사용자 지갑 주소 (nullable) |
| exchange | VARCHAR(20) | 거래소 (기본값: hyperliquid) |
| side | VARCHAR(10) | 포지션 방향 (long/short, nullable) |
| leverage | INT | 레버리지 배수 (nullable) |
| entry_price | DECIMAL(30,8) | 진입가 (nullable) |
| mark_price | DECIMAL(30,8) | 분석 시점 현재가 (nullable) |
| created_at | TIMESTAMP | 저장 시각 |

### 7.3 API 요청 시 전달

프론트엔드에서 분석 요청 시 `userAddress`와 `exchange`를 선택적으로 전달할 수 있다:

```json
{
  "positions": [...],
  "symbol": "BTC",
  "userAddress": "0x...",
  "exchange": "hyperliquid"
}
```

---

## 8. UI 툴팁

### 8.1 개요

AI Copilot 패널의 각 분석 지표에 마우스 호버 시 한국어 설명 툴팁을 표시한다.

### 8.2 구현 방식

- `createPortal`을 사용하여 `document.body`에 `position: fixed`로 렌더링
- 부모 컨테이너의 `overflow` 속성에 영향받지 않음
- `z-index: 9999`로 항상 최상위에 표시

### 8.3 툴팁 대상

| 탭 | 대상 | 설명 |
|----|------|------|
| 리스크 | 각 Risk Factor (5개) | 레버리지, 청산거리, 변동성, 펀딩, 집중도 설명 |
| 리스크 | S/R 지표 (5개) | Short-Term High/Low, VWAP, Pivot R1/S1 설명 |
| 펀딩 | Trend (3개) + Z-Score + Mean Reversion | 각 시간대 추세, 표준편차, 평균 회귀 설명 |
| OI | 시나리오 | OI+가격 조합 판단 기준 설명 |
| 탭 헤더 | 각 탭 (6개) | 탭별 분석 내용 요약 (리스크, 펀딩, OI, 청산, 전략, 제안) |


---

## 9. 전략 조언 (Strategy Advice)

### 9.1 개요

포지션 분석 시 LLM을 활용하여 단기(1일~7일) / 중기(8일~21일) 전략 조언을 생성한다. TP/SL 라인 추천, 시장 전망, 핵심 가격 레벨, 운용 팁을 포함한다.

### 9.2 UI 표시 ("전략" 탭)

포지션 분석 결과의 6번째 탭 중 "전략" 탭에서 표시된다.

| 항목 | 설명 |
|------|------|
| TP / SL 박스 | 단기/중기별 Take Profit, Stop Loss 가격 |
| 전망 (Outlook) | 해당 기간의 시장 전망 요약 |
| 핵심 레벨 (Key Level) | 주요 지지/저항 가격대 |
| 운용 팁 (Tip) | 실전 운용 조언 |

### 9.3 데이터 구조

```typescript
interface StrategyAdvice {
  shortTerm: StrategyTimeframe;  // 단기 (1일~7일)
  midTerm: StrategyTimeframe;    // 중기 (8일~21일)
}

interface StrategyTimeframe {
  period: string;    // e.g. "1일~7일"
  tp: number;        // Take Profit 가격
  sl: number;        // Stop Loss 가격
  outlook: string;   // 시장 전망
  keyLevel: string;  // 핵심 가격 레벨
  tip: string;       // 운용 팁
}
```

### 9.4 LLM 프롬프트

포지션 정보(코인, 방향, 진입가, 레버리지, 사이즈, 마진)와 Rule Engine 결과(S/R, 펀딩, OI)를 컨텍스트로 제공하여 LLM이 구조화된 JSON으로 전략 조언을 생성한다.

### 9.5 인수 조건

1. WHEN 포지션 분석이 완료되면, THE AI_Engine SHALL 포지션 정보와 Rule Engine 결과를 기반으로 전략 조언을 생성한다
2. THE AI_Copilot SHALL "전략" 탭에서 단기/중기 TP/SL, 전망, 핵심 레벨, 운용 팁을 표시한다
3. IF AI Engine 호출이 실패하면, THEN strategyAdvice는 null로 반환되고 "전략" 탭에 "AI 분석 실패" 메시지를 표시한다
