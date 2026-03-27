# 요구사항 문서

## 소개

PDEX Analysis Server는 PDEX Terminal의 백엔드 분석 서비스이다. 사용자의 Open Position 데이터와 마켓 데이터를 수신하여 Rule Engine 기반 수치 분석과 AI Engine(LLM) 기반 해석을 수행하고, 분석 결과를 REST API로 반환한다. 본 문서는 Open Position 분석 기능에 한정하여 요구사항을 정의한다.

## 용어 사전

- **Analysis_Server**: Node.js + TypeScript 기반 백엔드 서비스로, Rule Engine과 AI Engine을 통해 분석 요청을 처리하고 결과를 반환하는 시스템
- **Rule_Engine**: 수치 계산, 지표 산출, 조건 판별을 담당하는 모듈. AI 없이 독립적으로 동작한다
- **AI_Engine**: Rule_Engine의 산출 결과를 입력으로 받아 LLM API를 호출하여 한국어 해석과 전략 코멘트를 생성하는 모듈
- **Risk_Score**: 레버리지, 청산 거리, 변동성, 펀딩 방향, 포지션 집중도를 종합한 1~10 척도의 위험도 점수
- **Funding_Rate**: 무기한 선물 계약에서 롱/숏 포지션 간 주기적으로 교환되는 수수료율
- **Funding_Z_Score**: 현재 Funding_Rate의 30일 평균 대비 표준편차 위치를 나타내는 통계 지표
- **Open_Interest**: 특정 자산의 미결제 선물 계약 총량
- **OI_Spike**: Open_Interest 변화율이 임계값(기본 5%)을 초과하는 급격한 변화 이벤트
- **Liquidation_Cluster**: 특정 가격대에 밀집된 롱 또는 숏 청산 예상 가격 구간
- **Support_Resistance**: 가격의 지지선과 저항선으로, 7일/30일 High/Low, VWAP, Pivot 기반으로 산출되는 가격 수준
- **VWAP**: Volume Weighted Average Price, 거래량 가중 평균 가격
- **Pivot_Level**: 전일 고가, 저가, 종가를 기반으로 산출하는 지지/저항 가격 수준
- **Hyperliquid_API**: 마켓 데이터(가격, 펀딩 레이트, Open Interest 등)를 조회하기 위한 Hyperliquid 거래소의 REST API
- **Open_Position**: 사용자가 현재 보유 중인 미결제 선물 포지션 (코인, 방향, 진입가, 크기, 레버리지, 청산가 포함)
- **Web_Service**: PDEX Terminal의 프론트엔드 서비스로, Analysis_Server에 분석을 요청하는 클라이언트

## 요구사항

### 요구사항 1: 아키텍처 — Rule Engine과 AI Engine 분리

**사용자 스토리:** 개발자로서, 수치 계산과 AI 해석을 분리된 모듈로 구현하여 독립적으로 테스트하고 유지보수하고 싶다.

#### 인수 조건

1. THE Analysis_Server SHALL Rule_Engine과 AI_Engine을 분리된 모듈로 구현한다
2. THE Rule_Engine SHALL 수치 계산, 지표 산출, 조건 판별을 담당한다
3. THE AI_Engine SHALL Rule_Engine의 산출 결과를 입력으로 받아 LLM API를 호출하여 한국어 해석과 전략 코멘트를 생성한다
4. THE Rule_Engine의 산출 결과는 AI_Engine 없이도 독립적으로 조회 가능해야 한다
5. IF AI_Engine의 LLM API 호출이 실패하면, THEN THE Analysis_Server SHALL Rule_Engine의 수치 결과만 포함한 응답을 반환한다

### 요구사항 2: 포지션 리스크 분석 API

**사용자 스토리:** 사용자로서, 내 오픈 포지션의 리스크를 종합적으로 분석한 결과를 받고 싶다.

#### 인수 조건

1. WHEN Web_Service가 포지션 리스크 분석을 요청하면, THE Analysis_Server SHALL 각 포지션에 대해 5가지 리스크 요소를 산출한다
2. THE Rule_Engine SHALL Leverage Risk를 레버리지 배율 기반으로 0~2점 범위에서 산출한다
3. THE Rule_Engine SHALL Liquidation Risk를 현재 가격에서 청산가까지의 거리 기반으로 0~2점 범위에서 산출한다
4. THE Rule_Engine SHALL Volatility Risk를 현재 변동성 대비 레버리지 기반으로 0~2점 범위에서 산출한다
5. THE Rule_Engine SHALL Funding Crowd Risk를 Funding_Rate 방향과 포지션 방향의 일치도 기반으로 0~2점 범위에서 산출한다
6. THE Rule_Engine SHALL Position Concentration Risk를 전체 포트폴리오 대비 해당 포지션 비중 기반으로 0~2점 범위에서 산출한다
7. THE Rule_Engine SHALL 5가지 요소 점수를 합산하여 1~10 척도의 Risk_Score를 산출한다
8. THE AI_Engine SHALL Risk_Score와 개별 요소 점수를 입력으로 받아 해당 점수의 근거와 리스크 해석을 한국어로 생성한다

### 요구사항 3: Support/Resistance 산출

**사용자 스토리:** 사용자로서, 현재 포지션과 관련된 주요 지지선과 저항선 정보를 받고 싶다.

#### 인수 조건

1. WHEN 포지션 리스크 분석이 요청되면, THE Rule_Engine SHALL 해당 코인의 Support_Resistance 수준을 산출한다
2. THE Rule_Engine SHALL 최근 7일 High/Low를 단기 지지/저항으로 산출한다
3. THE Rule_Engine SHALL 최근 30일 High/Low를 중기 지지/저항으로 산출한다
4. THE Rule_Engine SHALL VWAP를 거래량 가중 평균가로 산출한다
5. THE Rule_Engine SHALL Pivot_Level을 전일 고가, 저가, 종가 기반으로 산출한다
6. THE AI_Engine SHALL 현재 가격과 지지/저항선의 근접도를 해석하고 돌파 또는 반등 가능성에 대한 코멘트를 한국어로 생성한다

### 요구사항 4: 펀딩 레이트 분석 API

**사용자 스토리:** 사용자로서, 펀딩 레이트 추세와 시그널을 분석한 결과를 받고 싶다.

#### 인수 조건

1. WHEN Web_Service가 펀딩 분석을 요청하면, THE Analysis_Server SHALL 해당 코인의 펀딩 레이트 분석을 수행한다
2. THE Rule_Engine SHALL 1시간, 4시간, 24시간 구간의 Funding_Rate 추세를 산출한다
3. THE Rule_Engine SHALL 현재 Funding_Rate의 30일 평균 대비 Funding_Z_Score를 산출한다
4. WHEN Funding_Z_Score가 +2 이상이면, THE Rule_Engine SHALL Mean Reversion 가능성을 "높음"으로 판별한다
5. WHEN Funding_Rate가 +0.1% 이상이면, THE Rule_Engine SHALL "극단 펀딩: 롱 과밀" Extreme Signal을 생성한다
6. WHEN Funding_Rate가 -0.1% 이하이면, THE Rule_Engine SHALL "극단 펀딩: 숏 과밀" Extreme Signal을 생성한다
7. THE AI_Engine SHALL 펀딩 추세, Mean Reversion 가능성, Extreme Signal을 입력으로 받아 시장 상황 해석을 한국어로 생성한다

### 요구사항 5: Open Interest 분석 API

**사용자 스토리:** 사용자로서, Open Interest 변화와 가격 움직임의 관계를 분석한 결과를 받고 싶다.

#### 인수 조건

1. WHEN Web_Service가 OI 분석을 요청하면, THE Analysis_Server SHALL 해당 코인의 Open_Interest 분석을 수행한다
2. WHEN 가격이 상승하고 Open_Interest가 증가하면, THE Rule_Engine SHALL "신규 롱 진입, 추세 강화" 시나리오로 판별한다
3. WHEN 가격이 상승하고 Open_Interest가 감소하면, THE Rule_Engine SHALL "숏 청산, 추세 약화" 시나리오로 판별한다
4. WHEN 가격이 하락하고 Open_Interest가 증가하면, THE Rule_Engine SHALL "신규 숏 진입, 하락 추세 강화" 시나리오로 판별한다
5. WHEN 가격이 하락하고 Open_Interest가 감소하면, THE Rule_Engine SHALL "롱 청산, 하락 추세 약화" 시나리오로 판별한다
6. WHEN Open_Interest 변화율이 5% 이상이면, THE Rule_Engine SHALL OI_Spike로 감지한다
7. THE AI_Engine SHALL 시나리오 판별 결과와 OI_Spike 여부를 입력으로 받아 시장 참여자 행동 해석을 한국어로 생성한다

### 요구사항 6: Liquidation Cluster 분석 API

**사용자 스토리:** 사용자로서, 주요 청산 가격대를 파악하여 가격 변동의 잠재적 트리거 포인트를 알고 싶다.

#### 인수 조건

1. WHEN Web_Service가 Liquidation Cluster 분석을 요청하면, THE Analysis_Server SHALL 해당 코인의 롱/숏 Liquidation_Cluster 가격대를 산출한다
2. THE Rule_Engine SHALL 현재 시장의 주요 롱 청산 클러스터 가격대를 산출한다
3. THE Rule_Engine SHALL 현재 시장의 주요 숏 청산 클러스터 가격대를 산출한다
4. THE AI_Engine SHALL Liquidation_Cluster 위치와 현재 가격의 관계를 해석하고 Price Magnet 가능성에 대한 코멘트를 한국어로 생성한다
5. WHEN Liquidation_Cluster가 현재 가격의 ±2% 이내에 위치하면, THE Rule_Engine SHALL "청산 클러스터 근접" 경고 플래그를 설정한다

### 요구사항 7: 마켓 데이터 조회 및 캐싱

**사용자 스토리:** 개발자로서, Hyperliquid API에서 마켓 데이터를 효율적으로 조회하고 캐싱하여 분석 성능을 확보하고 싶다.

#### 인수 조건

1. THE Analysis_Server SHALL Hyperliquid_API를 통해 가격, 펀딩 레이트, Open Interest, 캔들 데이터를 조회한다
2. THE Analysis_Server SHALL 조회한 마켓 데이터를 Redis에 캐싱한다
3. WHEN 캐싱된 데이터의 유효 기간이 만료되면, THE Analysis_Server SHALL Hyperliquid_API에서 최신 데이터를 재조회한다
4. IF Hyperliquid_API 호출이 실패하면, THEN THE Analysis_Server SHALL 캐싱된 데이터가 존재할 경우 해당 데이터를 사용하고, 응답에 데이터 시점을 명시한다
5. IF Hyperliquid_API 호출이 실패하고 캐싱된 데이터도 존재하지 않으면, THEN THE Analysis_Server SHALL 오류 응답을 반환한다

### 요구사항 8: 분석 API 엔드포인트

**사용자 스토리:** 개발자로서, Web_Service가 분석 결과를 요청할 수 있는 REST API 엔드포인트를 제공하고 싶다.

#### 인수 조건

1. THE Analysis_Server SHALL Open Position 종합 분석을 위한 REST API 엔드포인트를 제공한다
2. WHEN 분석 요청을 수신하면, THE Analysis_Server SHALL 요청 본문에 포함된 포지션 데이터와 코인 심볼을 검증한다
3. IF 요청 본문이 유효하지 않으면, THEN THE Analysis_Server SHALL HTTP 400 상태 코드와 검증 오류 메시지를 포함한 JSON 응답을 반환한다
4. THE Analysis_Server SHALL 분석 요청을 수신한 후 10초 이내에 응답한다
5. THE Analysis_Server SHALL 분석 결과를 JSON 형식으로 반환한다
6. IF 분석 처리 중 내부 오류가 발생하면, THEN THE Analysis_Server SHALL HTTP 500 상태 코드와 오류 메시지를 포함한 JSON 응답을 반환한다

### 요구사항 9: 분석 요청/응답 데이터 직렬화

**사용자 스토리:** 개발자로서, 분석 요청과 응답 데이터를 안정적으로 직렬화/역직렬화하고 싶다.

#### 인수 조건

1. THE Analysis_Server SHALL 분석 요청 JSON을 내부 데이터 모델로 파싱하는 파서를 제공한다
2. THE Analysis_Server SHALL 내부 분석 결과 모델을 JSON 문자열로 직렬화하는 포매터를 제공한다
3. FOR ALL 유효한 분석 요청에 대해, 파싱 후 직렬화한 결과를 다시 파싱하면 원본과 동일한 데이터 모델이 생성된다 (라운드트립 속성)
4. FOR ALL 유효한 분석 응답에 대해, 직렬화 후 파싱한 결과를 다시 직렬화하면 원본과 동일한 JSON 문자열이 생성된다 (라운드트립 속성)

### 요구사항 10: 히스토리 데이터 저장

**사용자 스토리:** 개발자로서, 분석 결과와 마켓 데이터 히스토리를 저장하여 추세 분석에 활용하고 싶다.

#### 인수 조건

1. WHEN 분석이 완료되면, THE Analysis_Server SHALL 분석 결과를 PostgreSQL에 저장한다
2. THE Analysis_Server SHALL 펀딩 레이트 히스토리 데이터를 PostgreSQL에 저장한다
3. THE Analysis_Server SHALL Open Interest 히스토리 데이터를 PostgreSQL에 저장한다
4. WHEN Rule_Engine이 Funding_Z_Score를 산출할 때, THE Rule_Engine SHALL PostgreSQL에 저장된 30일 펀딩 레이트 히스토리를 조회한다
5. IF PostgreSQL 연결이 실패하면, THEN THE Analysis_Server SHALL 분석 처리는 계속 수행하고 저장 실패를 로그에 기록한다
