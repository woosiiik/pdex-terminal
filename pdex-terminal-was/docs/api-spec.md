# PDEX Analysis Server — REST API 규격 문서

> Base URL: `/api/v1`

## 목차

- [공통 사항](#공통-사항)
- [1. 포지션 종합 분석](#1-포지션-종합-분석)
- [2. 펀딩 레이트 분석](#2-펀딩-레이트-분석)
- [3. Open Interest 분석](#3-open-interest-분석)
- [4. Liquidation Cluster 분석](#4-liquidation-cluster-분석)
- [5. 오더 종합 분석](#5-오더-종합-분석)
- [6. 서버 상태 확인](#6-서버-상태-확인)
- [데이터 타입 참조](#데이터-타입-참조)

---

## 공통 사항

### 요청 헤더

| 헤더 | 값 | 필수 |
|------|-----|------|
| Content-Type | application/json | POST 요청 시 필수 |

### 공통 응답 필드

모든 성공 응답은 다음 필드를 포함한다:

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | 처리 성공 여부 |
| timestamp | string | 응답 생성 시각 (ISO 8601) |
| symbol | string | 분석 대상 코인 심볼 |
| dataFreshness | object | 마켓 데이터 신선도 정보 |
| dataFreshness.source | "live" \| "cached" | 데이터 출처 |
| dataFreshness.cachedAt | string \| undefined | 캐시 데이터 시점 (cached일 때만) |

### 공통 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 오류 메시지",
    "details": {}
  }
}
```

| 에러 코드 | HTTP 상태 | 설명 |
|-----------|-----------|------|
| VALIDATION_ERROR | 400 | 요청 본문 검증 실패 |
| MARKET_DATA_UNAVAILABLE | 503 | 마켓 데이터 조회 불가 (API 실패 + 캐시 없음) |
| INTERNAL_ERROR | 500 | 내부 처리 오류 |
| ANALYSIS_TIMEOUT | 504 | 분석 타임아웃 (10초 초과) |

---

## 1. 포지션 종합 분석

Open Position에 대한 종합 분석을 수행한다. Risk Score, Support/Resistance, Funding, OI, Liquidation 분석을 모두 포함한다.

### `POST /api/v1/analysis/position`

#### Request Body

```json
{
  "positions": [
    {
      "coin": "BTC",
      "side": "long",
      "entryPrice": 65000,
      "size": 0.5,
      "leverage": 10,
      "liquidationPrice": 58500,
      "marginUsed": 3250
    }
  ],
  "symbol": "BTC"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| positions | OpenPosition[] | ✅ | 분석 대상 포지션 배열 (최소 1개) |
| positions[].coin | string | ✅ | 코인 심볼 (e.g. "BTC", "ETH") |
| positions[].side | "long" \| "short" | ✅ | 포지션 방향 |
| positions[].entryPrice | number | ✅ | 진입 가격 (> 0) |
| positions[].size | number | ✅ | 포지션 크기 (> 0) |
| positions[].leverage | number | ✅ | 레버리지 배율 (>= 1) |
| positions[].liquidationPrice | number | ✅ | 청산 가격 (> 0) |
| positions[].marginUsed | number | ✅ | 사용 마진 (> 0) |
| symbol | string | ✅ | 분석 대상 코인 심볼 |


#### Response Body (200 OK)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "symbol": "BTC",
  "dataFreshness": {
    "source": "live"
  },
  "ruleEngine": {
    "riskScore": {
      "totalScore": 7,
      "leverageRisk": 1,
      "liquidationRisk": 2,
      "volatilityRisk": 1,
      "fundingCrowdRisk": 2,
      "concentrationRisk": 1
    },
    "supportResistance": {
      "shortTermHigh": 67500,
      "shortTermLow": 63200,
      "midTermHigh": 69800,
      "midTermLow": 58400,
      "vwap": 65120.5,
      "pivotPoint": 65300,
      "pivotR1": 66800,
      "pivotS1": 63800
    },
    "funding": {
      "currentRate": 0.0003,
      "trend1h": "rising",
      "trend4h": "stable",
      "trend24h": "rising",
      "zScore": 1.8,
      "meanReversionProbability": "보통",
      "extremeSignal": null
    },
    "openInterest": {
      "currentOI": 125000000,
      "oiChangePercent": 3.2,
      "priceChangePercent": 1.5,
      "scenario": "신규 롱 진입, 추세 강화",
      "isSpike": false
    },
    "liquidation": {
      "longClusters": [
        {
          "priceLevel": 62000,
          "estimatedVolume": 15000000,
          "distancePercent": -4.6
        }
      ],
      "shortClusters": [
        {
          "priceLevel": 68000,
          "estimatedVolume": 12000000,
          "distancePercent": 4.6
        }
      ],
      "nearbyWarning": false,
      "nearbyClusterSide": null
    }
  },
  "aiInterpretation": {
    "riskInterpretation": "현재 BTC 롱 포지션의 리스크 점수는 7/10으로 '높음' 등급입니다. 10배 레버리지와 펀딩 레이트 방향이 롱에 불리한 점이 주요 리스크 요인입니다.",
    "srInterpretation": "현재 가격은 7일 저항선(67,500) 아래에 위치하며, VWAP(65,120) 근처에서 거래 중입니다. 단기 지지선(63,200) 이탈 시 추가 하락 가능성이 있습니다.",
    "fundingInterpretation": "펀딩 레이트가 0.03%로 양수이며 1시간/24시간 기준 상승 추세입니다. Z-Score 1.8로 아직 극단 수준은 아니나 롱 포지션에 비용 부담이 증가하고 있습니다.",
    "oiInterpretation": "가격 상승과 함께 OI가 3.2% 증가하여 신규 롱 진입이 활발합니다. 추세 강화 신호이나, OI Spike 수준은 아닙니다.",
    "liquidationInterpretation": "주요 롱 청산 클러스터가 $62,000에 위치하며 현재 가격에서 4.6% 거리입니다. 즉각적인 청산 위험은 낮으나 급격한 하락 시 주의가 필요합니다.",
    "overallSummary": "BTC 롱 포지션은 높은 레버리지와 펀딩 비용 부담으로 리스크가 높은 상태입니다. 단기 지지선(63,200)과 청산 클러스터(62,000)를 주시하며, 레버리지 축소를 고려해보세요."
  }
}
```

#### Response Body — AI 실패 시 (200 OK)

AI Engine 호출이 실패한 경우, `aiInterpretation`이 `null`로 반환된다:

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "symbol": "BTC",
  "dataFreshness": { "source": "live" },
  "ruleEngine": { "..." : "Rule Engine 결과 동일" },
  "aiInterpretation": null
}
```

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "요청 본문이 유효하지 않습니다",
    "details": {
      "positions": "최소 1개의 포지션이 필요합니다",
      "positions[0].leverage": "레버리지는 1 이상이어야 합니다"
    }
  }
}
```

---

## 2. 펀딩 레이트 분석

특정 코인의 펀딩 레이트 분석을 단독으로 수행한다.

### `POST /api/v1/analysis/funding`

#### Request Body

```json
{
  "symbol": "BTC"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| symbol | string | ✅ | 분석 대상 코인 심볼 |

#### Response Body (200 OK)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "symbol": "BTC",
  "dataFreshness": {
    "source": "live"
  },
  "ruleEngine": {
    "currentRate": 0.0012,
    "trend1h": "rising",
    "trend4h": "rising",
    "trend24h": "stable",
    "zScore": 2.5,
    "meanReversionProbability": "높음",
    "extremeSignal": "극단 펀딩: 롱 과밀"
  },
  "aiInterpretation": {
    "fundingInterpretation": "BTC 펀딩 레이트가 0.12%로 극단적 수준입니다. Z-Score 2.5로 30일 평균 대비 크게 벗어나 있어 평균 회귀 가능성이 높습니다. 롱 포지션 보유 시 높은 펀딩 비용에 주의하세요."
  }
}
```

---

## 3. Open Interest 분석

특정 코인의 Open Interest 분석을 단독으로 수행한다.

### `POST /api/v1/analysis/oi`

#### Request Body

```json
{
  "symbol": "ETH"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| symbol | string | ✅ | 분석 대상 코인 심볼 |

#### Response Body (200 OK)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "symbol": "ETH",
  "dataFreshness": {
    "source": "live"
  },
  "ruleEngine": {
    "currentOI": 85000000,
    "oiChangePercent": 7.3,
    "priceChangePercent": -2.1,
    "scenario": "신규 숏 진입, 하락 추세 강화",
    "isSpike": true
  },
  "aiInterpretation": {
    "oiInterpretation": "ETH의 OI가 7.3% 급증하며 OI Spike가 감지되었습니다. 가격 하락과 동시에 OI가 증가하여 신규 숏 포지션이 대거 진입한 것으로 보입니다. 하락 추세가 강화되고 있어 롱 포지션 보유 시 주의가 필요합니다."
  }
}
```

---

## 4. Liquidation Cluster 분석

특정 코인의 Liquidation Cluster 분석을 단독으로 수행한다.

### `POST /api/v1/analysis/liquidation`

#### Request Body

```json
{
  "symbol": "BTC"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| symbol | string | ✅ | 분석 대상 코인 심볼 |

#### Response Body (200 OK)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "symbol": "BTC",
  "dataFreshness": {
    "source": "live"
  },
  "ruleEngine": {
    "longClusters": [
      {
        "priceLevel": 63500,
        "estimatedVolume": 25000000,
        "distancePercent": -2.3
      },
      {
        "priceLevel": 61000,
        "estimatedVolume": 18000000,
        "distancePercent": -6.2
      }
    ],
    "shortClusters": [
      {
        "priceLevel": 66800,
        "estimatedVolume": 20000000,
        "distancePercent": 1.5
      }
    ],
    "nearbyWarning": true,
    "nearbyClusterSide": "both"
  },
  "aiInterpretation": {
    "liquidationInterpretation": "BTC의 롱 청산 클러스터($63,500)와 숏 청산 클러스터($66,800)가 모두 현재 가격의 ±2% 이내에 위치합니다. 양방향 청산 클러스터가 근접해 있어 급격한 가격 변동(Price Magnet) 가능성이 높습니다. 포지션 크기 조절을 권장합니다."
  }
}
```

---

## 5. 오더 종합 분석

미체결 주문에 대한 종합 분석을 수행한다. 전략 탐지, 체결 가능성, 주문 집중도, 포지션 영향 분석을 포함한다. 하이퍼리퀴드에서 캔들(변동성), 펀딩 레이트, L2 오더북 데이터를 추가로 가져와 분석 정확도를 높인다.

### `POST /api/v1/analysis/order`

#### Request Body

```json
{
  "orders": [
    {
      "coin": "BTC",
      "side": "buy",
      "type": "limit",
      "price": 62000,
      "size": 0.1,
      "timestamp": 1705312200000
    },
    {
      "coin": "BTC",
      "side": "sell",
      "type": "limit",
      "price": 68000,
      "size": 0.1,
      "timestamp": 1705312200000
    }
  ],
  "positions": [
    {
      "coin": "BTC",
      "side": "long",
      "entryPrice": 65000,
      "size": 0.5,
      "leverage": 10,
      "liquidationPrice": 58500,
      "marginUsed": 3250
    }
  ],
  "symbol": "BTC"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| orders | OpenOrder[] | ✅ | 분석 대상 미체결 주문 배열 (최소 1개) |
| orders[].coin | string | ✅ | 코인 심볼 |
| orders[].side | "buy" \| "sell" | ✅ | 주문 방향 |
| orders[].type | "limit" \| "market" | ✅ | 주문 유형 |
| orders[].price | number | ✅ | 주문 가격 (> 0) |
| orders[].size | number | ✅ | 주문 수량 (> 0) |
| orders[].timestamp | number | ✅ | 주문 생성 시각 (Unix ms) |
| positions | OpenPosition[] | ❌ | 현재 오픈 포지션 (포지션 영향 분석용, 기본값 []) |
| symbol | string | ✅ | 분석 대상 코인 심볼 |

#### Response Body (200 OK)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "symbol": "BTC",
  "ruleEngine": {
    "strategy": {
      "detectedStrategy": "range",
      "confidence": "medium",
      "description": "62,000 ~ 68,000 범위 내 레인지 트레이딩 | 펀딩 롱 과열 (+0.0300%)",
      "orderCount": 2,
      "priceRange": { "min": 62000, "max": 68000 },
      "buyCount": 1,
      "sellCount": 1
    },
    "executionProbability": {
      "items": [
        {
          "coin": "BTC",
          "side": "buy",
          "price": 62000,
          "size": 0.1,
          "distancePercent": -4.6,
          "probability": "medium"
        },
        {
          "coin": "BTC",
          "side": "sell",
          "price": 68000,
          "size": 0.1,
          "distancePercent": 4.6,
          "probability": "medium"
        }
      ],
      "highCount": 0,
      "mediumCount": 2,
      "lowCount": 0
    },
    "orderClusters": {
      "clusters": [],
      "dominantSide": "balanced"
    },
    "positionImpact": {
      "items": [
        {
          "coin": "BTC",
          "orderSide": "buy",
          "orderPrice": 62000,
          "orderSize": 0.1,
          "purpose": "position_expansion",
          "description": "롱 포지션 추가 진입 주문"
        },
        {
          "coin": "BTC",
          "orderSide": "sell",
          "orderPrice": 68000,
          "orderSize": 0.1,
          "purpose": "take_profit",
          "description": "롱 포지션 익절 주문 (68,000)"
        }
      ],
      "hasRiskReduction": true,
      "hasRiskIncrease": true
    }
  },
  "aiInterpretation": {
    "strategyInterpretation": "62,000~68,000 구간에서 레인지 트레이딩 전략이 탐지되었습니다.",
    "executionInterpretation": "두 주문 모두 현재가 대비 4.6% 거리로 중간 수준의 체결 가능성입니다.",
    "clusterInterpretation": "주문이 분산되어 있어 특정 가격대 집중 구간은 없습니다.",
    "impactInterpretation": "익절 주문과 추가 진입 주문이 혼합되어 있어 리스크 증감이 동시에 존재합니다.",
    "overallSummary": "레인지 트레이딩 전략으로 하단 매수, 상단 익절 구조입니다. 펀딩 레이트가 롱 과열 상태이므로 하단 매수 시 주의가 필요합니다."
  }
}
```

#### 시장 데이터 활용

오더 분석 시 하이퍼리퀴드에서 다음 데이터를 추가로 가져온다:

| 데이터 | 용도 |
|--------|------|
| 1일봉 캔들 | 24시간 변동성(ATR) 계산 → 체결 가능성 임계값 동적 조정 |
| 펀딩 레이트 | 시장 과열 컨텍스트 → 전략 설명에 반영 |
| L2 오더북 | 주문가까지의 유동성 분석 → 체결 가능성 보정 |

---

## 6. 서버 상태 확인

### `GET /api/v1/health`

#### Response Body (200 OK)

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "redis": "connected",
    "postgresql": "connected",
    "hyperliquid": "reachable"
  }
}
```

---

## 데이터 타입 참조

### OpenPosition

| 필드 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| coin | string | 비어있지 않음 | 코인 심볼 |
| side | string | "long" \| "short" | 포지션 방향 |
| entryPrice | number | > 0 | 진입 가격 |
| size | number | > 0 | 포지션 크기 |
| leverage | number | >= 1 | 레버리지 배율 |
| liquidationPrice | number | > 0 | 청산 가격 |
| marginUsed | number | > 0 | 사용 마진 |

### RiskScoreResult

| 필드 | 타입 | 범위 | 설명 |
|------|------|------|------|
| totalScore | number | 1~10 | 종합 리스크 점수 |
| leverageRisk | number | 0~2 | 레버리지 리스크 |
| liquidationRisk | number | 0~2 | 청산 리스크 |
| volatilityRisk | number | 0~2 | 변동성 리스크 |
| fundingCrowdRisk | number | 0~2 | 펀딩 군중 리스크 |
| concentrationRisk | number | 0~2 | 집중도 리스크 |

### SupportResistanceResult

| 필드 | 타입 | 설명 |
|------|------|------|
| shortTermHigh | number | 7일 고가 |
| shortTermLow | number | 7일 저가 |
| midTermHigh | number | 30일 고가 |
| midTermLow | number | 30일 저가 |
| vwap | number | VWAP |
| pivotPoint | number | Pivot Point |
| pivotR1 | number | Resistance 1 |
| pivotS1 | number | Support 1 |

### FundingAnalysisResult

| 필드 | 타입 | 설명 |
|------|------|------|
| currentRate | number | 현재 펀딩 레이트 |
| trend1h | string | 1시간 추세 ("rising" \| "falling" \| "stable") |
| trend4h | string | 4시간 추세 |
| trend24h | string | 24시간 추세 |
| zScore | number | Funding Z-Score |
| meanReversionProbability | string | 평균 회귀 가능성 ("높음" \| "보통" \| "낮음") |
| extremeSignal | string \| null | 극단 시그널 |

### OIAnalysisResult

| 필드 | 타입 | 설명 |
|------|------|------|
| currentOI | number | 현재 OI |
| oiChangePercent | number | OI 변화율 (%) |
| priceChangePercent | number | 가격 변화율 (%) |
| scenario | string | 시나리오 판별 결과 |
| isSpike | boolean | OI Spike 여부 |

### LiquidationClusterResult

| 필드 | 타입 | 설명 |
|------|------|------|
| longClusters | PriceCluster[] | 롱 청산 클러스터 |
| shortClusters | PriceCluster[] | 숏 청산 클러스터 |
| nearbyWarning | boolean | 근접 경고 여부 |
| nearbyClusterSide | string \| null | 근접 클러스터 방향 ("long" \| "short" \| "both" \| null) |

### PriceCluster

| 필드 | 타입 | 설명 |
|------|------|------|
| priceLevel | number | 클러스터 가격 수준 |
| estimatedVolume | number | 예상 청산 규모 |
| distancePercent | number | 현재 가격 대비 거리 (%) |

### OpenOrder

| 필드 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| coin | string | 비어있지 않음 | 코인 심볼 |
| side | string | "buy" \| "sell" | 주문 방향 |
| type | string | "limit" \| "market" | 주문 유형 |
| price | number | > 0 | 주문 가격 |
| size | number | > 0 | 주문 수량 |
| timestamp | number | Unix ms | 주문 생성 시각 |

### StrategyDetectionResult

| 필드 | 타입 | 설명 |
|------|------|------|
| detectedStrategy | string | 탐지된 전략 ("grid" \| "range" \| "breakout" \| "accumulation" \| "unknown") |
| confidence | string | 신뢰도 ("high" \| "medium" \| "low") |
| description | string | 전략 설명 (시장 컨텍스트 포함) |
| orderCount | number | 분석 대상 주문 수 |
| priceRange | object | 주문 가격 범위 { min, max } |
| buyCount | number | 매수 주문 수 |
| sellCount | number | 매도 주문 수 |

### ExecutionProbabilityResult

| 필드 | 타입 | 설명 |
|------|------|------|
| items | ExecutionProbabilityItem[] | 개별 주문 체결 가능성 |
| highCount | number | High 등급 주문 수 |
| mediumCount | number | Medium 등급 주문 수 |
| lowCount | number | Low 등급 주문 수 |

### ExecutionProbabilityItem

| 필드 | 타입 | 설명 |
|------|------|------|
| coin | string | 코인 심볼 |
| side | string | 주문 방향 |
| price | number | 주문 가격 |
| size | number | 주문 수량 |
| distancePercent | number | 현재가 대비 거리 (%) |
| probability | string | 체결 가능성 ("high" \| "medium" \| "low") |

### OrderClusterResult

| 필드 | 타입 | 설명 |
|------|------|------|
| clusters | OrderCluster[] | 주문 집중 구간 목록 |
| dominantSide | string | 우세 방향 ("buy" \| "sell" \| "balanced") |

### OrderCluster

| 필드 | 타입 | 설명 |
|------|------|------|
| priceLevel | number | 클러스터 가격 수준 |
| totalSize | number | 총 주문 수량 |
| orderCount | number | 주문 개수 |
| side | string | 주문 방향 |
| clusterType | string | 클러스터 유형 ("sell_wall" \| "accumulation_zone" \| "distribution_zone") |
| distancePercent | number | 현재가 대비 거리 (%) |

### PositionImpactResult

| 필드 | 타입 | 설명 |
|------|------|------|
| items | PositionImpactItem[] | 개별 주문 영향 분석 |
| hasRiskReduction | boolean | 리스크 감소 주문 포함 여부 |
| hasRiskIncrease | boolean | 리스크 증가 주문 포함 여부 |

### PositionImpactItem

| 필드 | 타입 | 설명 |
|------|------|------|
| coin | string | 코인 심볼 |
| orderSide | string | 주문 방향 |
| orderPrice | number | 주문 가격 |
| orderSize | number | 주문 수량 |
| purpose | string | 주문 목적 ("take_profit" \| "stop_loss" \| "hedging" \| "position_expansion" \| "new_entry") |
| description | string | 한국어 설명 |
