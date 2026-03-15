# AI Copilot 분석 요구사항 상세 — Open Position 분석

> 이 문서는 PDEX Terminal의 AI Copilot **Open Position(오픈 포지션) 분석** 기능에 대한 상세 요구사항과 설계 권장 사항을 정의한다.
> Open Order(미체결 주문) 분석은 [ai-copilot-order-analysis.md](./ai-copilot-order-analysis.md)를 참조한다.
> 기본 요구사항은 `.kiro/specs/pdex-terminal/requirements.md`의 요구사항 8~10을 참조한다.

## 목차

1. [포지션 리스크 분석 (Risk Analysis)](#1-포지션-리스크-분석-risk-analysis)
2. [Support / Resistance 처리](#2-support--resistance-처리)
3. [펀딩 레이트 분석 (Funding Analysis)](#3-펀딩-레이트-분석-funding-analysis)
4. [Open Interest 분석 (OI Analysis)](#4-open-interest-분석-oi-analysis)
5. [Liquidation Cluster 분석](#5-liquidation-cluster-분석)
6. [AI 역할 분리 아키텍처](#6-ai-역할-분리-아키텍처)

---

## 1. 포지션 리스크 분석 (Risk Analysis)

### 1.1 개요

사용자의 오픈 포지션에 대해 다차원 리스크를 자동 분석하여 1~10 척도의 Risk Score를 산출한다.

### 1.2 Risk Score 계산 모델

Risk Score는 다음 5가지 요소의 합산으로 산출한다 (각 요소 0~2점, 총 0~10점):

| 요소 | 설명 | 점수 범위 |
|------|------|-----------|
| Leverage Risk | 레버리지 배율에 따른 위험도 | 0~2 |
| Liquidation Risk | 청산가까지의 거리 기반 위험도 | 0~2 |
| Volatility Risk | 현재 변동성 대비 레버리지 위험도 | 0~2 |
| Funding Crowd Risk | 펀딩 레이트 방향과 포지션 방향의 일치도 | 0~2 |
| Position Concentration Risk | 전체 포트폴리오 대비 해당 포지션 비중 | 0~2 |

#### 계산 예시

```
BTC long 5x

leverage risk      = 3  (높은 레버리지)
liquidation risk   = 2  (청산가 근접)
volatility risk    = 1  (변동성 보통)
funding risk       = 2  (펀딩 양수 → 롱 불리)
concentration risk = 1  (포트폴리오 비중 보통)

Risk Score = 9/10
```

> **참고**: 위 예시에서 leverage risk가 3으로 표기되어 있으나, 각 요소의 범위를 0~2로 설계할 경우 최대값은 2이다. 구현 시 각 요소의 점수 범위와 가중치를 명확히 정의해야 한다. 대안으로 각 요소 0~3점 범위(총 0~15점)를 사용하고 10점 척도로 정규화하는 방식도 고려할 수 있다.

### 1.3 Risk Score 해석 기준

| 점수 범위 | 등급 | 설명 |
|-----------|------|------|
| 1~3 | 낮음 (Low) | 안정적인 포지션 |
| 4~6 | 보통 (Medium) | 주의 필요 |
| 7~8 | 높음 (High) | 리스크 관리 권장 |
| 9~10 | 매우 높음 (Critical) | 즉시 조치 권장 |

### 1.4 인수 조건

1. WHEN 오픈 포지션 데이터가 로드되면, THE Web_Service SHALL Analysis_Server에 포지션 리스크 분석을 요청한다
2. THE Analysis_Server SHALL 각 포지션에 대해 5가지 리스크 요소를 종합하여 1~10 척도의 Risk_Score를 산출한다
3. THE AI_Copilot SHALL 각 포지션의 Risk_Score, 개별 요소 점수, 해당 점수의 근거를 한국어로 표시한다
4. WHEN 포지션 데이터가 변경되면, THE Analysis_Server SHALL 리스크 분석을 재수행하고 갱신된 결과를 전달한다
5. IF Analysis_Server로부터 5초 이내에 응답이 없으면, THEN THE AI_Copilot SHALL "분석 중..." 로딩 상태를 표시한다

---

## 2. Support / Resistance 처리

### 2.1 설계 원칙

Support / Resistance 계산은 **AI가 아닌 룰 기반(Rule Engine)**으로 처리한다. AI는 계산된 결과에 대한 **해석만 수행**한다.

### 2.2 룰 기반 지표

| 지표 | 설명 |
|------|------|
| 최근 7일 High / Low | 단기 지지/저항 |
| 최근 30일 High / Low | 중기 지지/저항 |
| VWAP (Volume Weighted Average Price) | 거래량 가중 평균가 |
| Pivot Levels | 피봇 포인트 기반 지지/저항 |

### 2.3 AI 해석 역할

- 현재 가격이 지지/저항선에 얼마나 근접한지 해석
- 돌파 또는 반등 가능성에 대한 코멘트 제공
- Risk Score의 "저항/지지선 근접도" 요소에 반영

---

## 3. 펀딩 레이트 분석 (Funding Analysis)

### 3.1 개요

펀딩 레이트의 추세, 평균 회귀 가능성, 극단 시그널을 분석하여 트레이딩 시그널을 제공한다.

### 3.2 분석 지표

| 지표 | 설명 |
|------|------|
| 1h Funding Trend | 최근 1시간 펀딩 추세 |
| 4h Funding Trend | 최근 4시간 펀딩 추세 |
| 24h Funding Trend | 최근 24시간 펀딩 추세 |
| Funding Z-Score | 현재 펀딩의 30일 평균 대비 표준편차 위치 |

### 3.3 분석 시나리오

#### Mean Reversion (평균 회귀)
```
현재 funding: 0.06%
30일 평균:    0.01%

→ AI 해석: "극단적 롱 과밀 (extreme long crowd), 평균 회귀 가능성 높음"
```

#### Extreme Signal (극단 시그널)
- Funding Rate ≥ +0.1% → "극단 펀딩 경고: 롱 과밀"
- Funding Rate ≤ -0.1% → "극단 펀딩 경고: 숏 과밀"

### 3.4 인수 조건

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

### 4.3 OI Spike 감지

급격한 OI 변화를 감지하여 시장 이벤트를 알린다.

- **감지 조건**: OI 변화율 > 5% (설정 가능)
- **AI 해석**: "대규모 신규 포지션 진입 감지 (New positions entering market)"

### 4.4 인수 조건

1. WHEN 사용자가 코인을 선택하면, THE Web_Service SHALL Analysis_Server에 해당 코인의 Open_Interest 분석을 요청한다
2. THE Analysis_Server SHALL 가격 변화와 OI 변화의 조합을 분석하여 4가지 시나리오를 판별한다
3. THE Analysis_Server SHALL OI 변화율이 5% 이상인 경우 OI Spike로 감지한다
4. THE AI_Copilot SHALL 현재 OI 변화율, 시나리오 판별 결과, AI 해석을 한국어로 표시한다

---

## 5. Liquidation Cluster 분석

### 5.1 개요

주요 청산 가격대를 분석하여 가격 변동의 잠재적 트리거 포인트를 식별한다.

### 5.2 분석 내용

```
Long liquidation cluster:  $64,500
Short liquidation cluster: $65,800

AI 해석: "청산 클러스터가 현재 가격 근처에 밀집 — Price magnet 가능성"
```

### 5.3 인수 조건

1. THE Analysis_Server SHALL 현재 시장의 주요 롱/숏 청산 클러스터 가격대를 산출한다
2. THE AI_Copilot SHALL 청산 클러스터 위치와 현재 가격과의 관계를 한국어로 표시한다
3. WHEN 청산 클러스터가 현재 가격의 ±2% 이내에 위치하면, THE AI_Copilot SHALL "청산 클러스터 근접" 경고를 표시한다

---

## 6. AI 역할 분리 아키텍처

### 6.1 설계 원칙

분석 시스템은 **Rule Engine**과 **AI**의 역할을 명확히 분리한다.

### 6.2 역할 분담

| 컴포넌트 | 역할 | 처리 내용 |
|----------|------|-----------|
| Rule Engine | 계산 및 데이터 처리 | Risk Score 산출, Support/Resistance 계산, Funding Z-Score 계산, OI Spike 감지, Liquidation Cluster 산출 |
| AI | 해석 및 설명 | 시장 상황 해석, 리스크 설명, 전략 코멘트, 종합 제안 생성 |

### 6.3 처리 흐름

```
[Market Data] → [Rule Engine] → 수치/지표 산출
                                      ↓
                                [AI Engine] → 해석/설명/제안 생성
                                      ↓
                                [AI Copilot UI] → 사용자에게 표시
```

### 6.4 인수 조건

1. THE Analysis_Server SHALL Rule Engine과 AI Engine을 분리된 모듈로 구현한다
2. THE Rule Engine SHALL 수치 계산, 지표 산출, 조건 판별을 담당한다
3. THE AI Engine SHALL Rule Engine의 산출 결과를 입력으로 받아 한국어 해석과 전략 코멘트를 생성한다
4. THE Rule Engine의 산출 결과는 AI Engine 없이도 독립적으로 조회 가능해야 한다