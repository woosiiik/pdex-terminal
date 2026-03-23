# AI Copilot 분석 요구사항 상세 — Open Order 분석

> 이 문서는 PDEX Terminal의 AI Copilot **Open Order(미체결 주문) 분석** 기능에 대한 상세 요구사항을 정의한다.
> Open Position(오픈 포지션) 분석은 [ai-copilot-position-analysis.md](./ai-copilot-position-analysis.md)를 참조한다.
> Open Order 분석은 이미 체결된 포지션의 리스크 분석과 달리, 사용자의 **의도(Intent)와 전략(Strategy)**을 분석하는 데 목적이 있다.

## 목차

1. [Strategy Detection (전략 탐지)](#1-strategy-detection-전략-탐지)
2. [Execution Probability (체결 가능성 분석)](#2-execution-probability-체결-가능성-분석)
3. [Order Cluster Analysis (주문 집중도 분석)](#3-order-cluster-analysis-주문-집중도-분석)
4. [Position Impact Analysis (포지션 영향 분석)](#4-position-impact-analysis-포지션-영향-분석)
5. [Strategy Adjustment Detection (전략 변경 탐지)](#5-strategy-adjustment-detection-전략-변경-탐지)
6. [AI Copilot 출력 형식](#6-ai-copilot-출력-형식)
7. [시장 데이터 패칭](#7-시장-데이터-패칭)

---

## 1. Strategy Detection (전략 탐지)

### 1.1 개요

사용자가 배치한 미체결 주문들의 가격 분포와 방향성을 분석하여 트레이딩 전략 패턴을 탐지한다.

### 1.2 탐지 전략 패턴

| 전략 | 설명 | 탐지 조건 |
|------|------|-----------|
| Grid Trading | 일정 간격으로 매수/매도 주문 배치 | 등간격 가격 분포, 양방향 주문 |
| Range Trading | 특정 가격 범위 내 반복 매매 | 상한/하한 근처 집중 주문 |
| Breakout Strategy | 돌파 시점 진입 주문 | 저항/지지선 근처 단방향 주문 |
| Accumulation Strategy | 점진적 매집 | 현재가 하방에 다수 매수 주문 |

### 1.3 인수 조건

1. WHEN Open Order 데이터가 로드되면, THE Web_Service SHALL Analysis_Server에 주문 전략 분석을 요청한다
2. THE Analysis_Server SHALL 주문 가격 분포와 방향성을 분석하여 전략 패턴을 탐지한다
3. THE AI_Copilot SHALL 탐지된 전략을 한국어로 설명한다
4. THE AI_Copilot SHALL 해당 전략의 특징과 예상 의도를 사용자에게 설명한다

---

## 2. Execution Probability (체결 가능성 분석)

### 2.1 개요

현재 시장 가격과 주문 가격의 차이를 기반으로 주문의 실제 체결 가능성을 평가한다.

### 2.2 체결 가능성 기준

기본 임계값은 현재가 대비 거리(%)로 판단하되, 24시간 변동성(ATR)과 L2 오더북 유동성으로 동적 보정한다.

| 등급 | 기본 조건 | 설명 |
|------|------|------|
| High | 현재가 대비 ±2% 이내 | 단기 체결 가능성 높음 |
| Medium | 현재가 대비 ±2~10% | 시장 변동에 따라 체결 가능 |
| Low | 현재가 대비 ±10% 이상 | 체결 가능성 낮음 |

#### 동적 보정

| 보정 요소 | 설명 |
|-----------|------|
| 변동성 조정 | 24시간 ATR이 높으면 임계값을 넓혀 체결 가능성을 상향 조정 |
| L2 유동성 | 주문가까지의 오더북 유동성이 충분하면 체결 가능성 상향 |

### 2.3 인수 조건

1. WHEN Open Order가 분석되면, THE Analysis_Server SHALL 현재 시장 가격과 주문 가격의 차이를 계산한다
2. IF 주문 가격이 현재 시장 가격 대비 10% 이상 차이가 날 경우, THEN THE AI_Copilot SHALL "체결 가능성 낮음" 경고를 표시한다
3. THE AI_Copilot SHALL 현재 시장 가격, 주문 가격, 체결 가능성 평가(High/Medium/Low)를 표시한다

---

## 3. Order Cluster Analysis (주문 집중도 분석)

### 3.1 개요

주문 가격의 분포를 분석하여 특정 가격대에 주문이 집중되어 있는지 탐지하고, 해당 구간의 전략적 의미를 해석한다.

### 3.2 집중 구간 유형

| 유형 | 설명 |
|------|------|
| Sell Wall | 특정 가격대에 대량 매도 주문 집중 |
| Accumulation Zone | 현재가 하방에 매수 주문 밀집 |
| Distribution Zone | 현재가 상방에 매도 주문 밀집 |

### 3.3 인수 조건

1. WHEN Open Order 데이터가 로드되면, THE Analysis_Server SHALL 주문 가격의 분포를 분석한다
2. THE Analysis_Server SHALL 특정 가격대에 주문이 집중되어 있는지 탐지한다
3. IF 특정 가격대에 주문이 밀집되어 있을 경우, THEN THE AI_Copilot SHALL 해당 구간을 "주문 집중 구간"으로 표시한다
4. THE AI_Copilot SHALL 해당 구간이 의미할 수 있는 전략을 한국어로 설명한다

---

## 4. Position Impact Analysis (포지션 영향 분석)

### 4.1 개요

미체결 주문이 현재 오픈 포지션의 리스크에 어떤 영향을 미치는지 분석한다. Open Position과 Open Order 데이터를 교차 분석하여 주문의 목적을 추론한다.

### 4.2 주문 목적 유형

| 유형 | 설명 | 탐지 조건 |
|------|------|-----------|
| Take Profit | 익절 주문 | 포지션 방향 반대, 이익 구간 가격 |
| Stop Loss | 손절 주문 | 포지션 방향 반대, 손실 구간 가격 |
| Hedging | 헤지 주문 | 반대 방향 포지션 생성 주문 |
| Position Expansion | 포지션 확대 | 같은 방향 추가 진입 주문 |

### 4.3 인수 조건

1. WHEN Open Order와 Open Position 데이터가 모두 존재할 경우, THE Analysis_Server SHALL 주문이 포지션에 미치는 영향을 분석한다
2. THE Analysis_Server SHALL Take Profit, Stop Loss, Hedging, Position Expansion 유형을 탐지한다
3. THE AI_Copilot SHALL 주문의 목적을 한국어로 설명한다

#### 해석 예시

```
"이 주문은 롱 포지션의 익절 주문으로 보입니다."
"현재 포지션 리스크를 줄이기 위한 헤지 주문으로 판단됩니다."
```

---

## 5. Strategy Adjustment Detection (전략 변경 탐지)

### 5.1 개요

주문 수정, 취소, 재배치 이벤트를 실시간으로 감지하여 사용자의 전략 변화를 분석한다.

### 5.2 감지 이벤트

| 이벤트 | 설명 |
|--------|------|
| 주문 가격 이동 | 기존 주문 취소 후 다른 가격에 재배치 |
| 주문 수량 변경 | 동일 가격에서 수량 증감 |
| 주문 취소 후 재배치 | 전략 방향 전환 가능성 |

### 5.3 인수 조건

1. WHEN WebSocket을 통해 주문 취소 또는 신규 주문 이벤트가 발생하면, THE Analysis_Server SHALL 이전 주문 상태와 비교 분석을 수행한다
2. THE Analysis_Server SHALL 주문 가격 이동, 수량 변경, 취소 후 재배치를 탐지한다
3. THE AI_Copilot SHALL 전략 변경 여부를 한국어로 설명한다

#### 해석 예시

```
"트레이더가 진입 가격을 낮추고 있습니다."
"브레이크아웃 전략으로 주문이 이동했습니다."
```

---

## 6. AI Copilot 출력 형식

### 6.1 출력 구조

AI Copilot은 Open Order 분석 결과를 다음 항목으로 구성하여 간결한 한국어 요약 형태로 제공한다:

- 탐지된 전략 유형
- 전략 설명
- 주문 체결 가능성
- 주문 집중 구간
- 포지션 리스크 영향
- 전략 변경 여부

### 6.2 출력 예시

```
전략 분석: Grid Trading
설명: 61,000 ~ 65,000 구간에서 반복 매매 전략으로 보입니다.

체결 가능성: Medium
현재 가격과 주문 가격 간 간격이 적당합니다.

포지션 영향:
현재 롱 포지션의 일부 익절 주문이 포함되어 있습니다.
```

### 6.3 AI 역할 분리

Open Position 분석과 동일하게 Rule Engine과 AI의 역할을 분리한다:

| 컴포넌트 | 역할 |
|----------|------|
| Rule Engine | 주문 가격 분포 계산, 체결 가능성 산출, 클러스터 탐지, 전략 패턴 매칭 |
| AI Engine | 전략 해석, 의도 추론, 포지션 영향 설명, 전략 변경 코멘트 |

---

## 7. 시장 데이터 패칭

### 7.1 개요

오더 분석 시 하이퍼리퀴드에서 추가 시장 데이터를 가져와 분석 정확도를 높인다.

### 7.2 패칭 데이터

| 데이터 | API | 용도 |
|--------|-----|------|
| 1일봉 캔들 | Hyperliquid candles API | 24시간 변동성(ATR) 계산 → 체결 가능성 임계값 동적 조정 |
| 펀딩 레이트 | Hyperliquid funding API | 시장 과열 컨텍스트 → 전략 설명에 반영 |
| L2 오더북 | Hyperliquid L2 book API | 주문가까지의 유동성 분석 → 체결 가능성 보정 |

### 7.3 데이터 구조

```typescript
interface OrderMarketContext {
  volatility24h: number;    // 24시간 ATR 기반 변동성
  fundingRate: number;      // 현재 펀딩 레이트
  l2Book: L2Book | null;    // L2 오더북 (bids/asks)
}
```