# Implementation Plan: PDEX Analysis Server

## Overview

Open Position 분석을 위한 Node.js + TypeScript 백엔드 서비스를 구현한다. 프로젝트 초기 설정 → 데이터 모델/타입 정의 → Rule Engine 5개 모듈 → Market Data Service → AI Engine → Analysis Orchestrator → REST API Layer → 통합 테스트 순서로 진행한다.

## Tasks

- [x] 1. 프로젝트 초기 설정 및 핵심 타입 정의
  - [x] 1.1 프로젝트 구조 생성 및 의존성 설치
    - `src/` 하위 디렉토리 구조 생성: `api/`, `validators/`, `orchestrator/`, `rule-engine/`, `ai-engine/`, `data/`, `types/`, `config/`
    - `package.json` 생성 및 의존성 설치: express, zod, openai, ioredis, pg, dotenv
    - dev 의존성: typescript, vitest, fast-check, supertest, @types/*
    - `tsconfig.json`, `vitest.config.ts` 설정
    - _Requirements: 1.1_

  - [x] 1.2 공통 타입 및 인터페이스 정의 (`src/types/`)
    - `OpenPosition`, `CandleData`, `FundingRateEntry`, `OIData`, `MarketMeta` 인터페이스 정의
    - `RiskScoreResult`, `SupportResistanceResult`, `FundingAnalysisResult`, `OIAnalysisResult`, `LiquidationClusterResult`, `PriceCluster` 인터페이스 정의
    - `AIInterpretation`, `RuleEngineResults` 인터페이스 정의
    - 요청/응답 타입 정의: `PositionAnalysisRequest`, `PositionAnalysisResponse`, `FundingAnalysisRequest/Response`, `OIAnalysisRequest/Response`, `LiquidationAnalysisRequest/Response`, `ErrorResponse`
    - `DataFreshness` 인터페이스 정의
    - _Requirements: 9.1, 9.2_

  - [x] 1.3 환경 설정 모듈 (`src/config/`)
    - Redis, PostgreSQL, OpenAI API 키, Hyperliquid API URL 등 환경 변수 로드
    - 캐시 TTL 설정값 정의 (가격 5초, 캔들 60초, 펀딩 30초, OI 30초, 메타 300초)
    - _Requirements: 7.2, 7.3_

- [x] 2. Request Validator 구현
  - [x] 2.1 Zod 스키마 및 검증 미들웨어 구현 (`src/validators/`)
    - `PositionAnalysisRequest` Zod 스키마: positions 배열 (최소 1개), 각 필드 타입/범위 검증
    - `FundingAnalysisRequest`, `OIAnalysisRequest`, `LiquidationAnalysisRequest` Zod 스키마
    - Express 미들웨어로 래핑하여 검증 실패 시 HTTP 400 + `ErrorResponse` 반환
    - _Requirements: 8.2, 8.3_

  - [ ]* 2.2 Property 테스트: 유효하지 않은 요청 거부
    - **Property 12: 유효하지 않은 요청 거부**
    - fast-check로 잘못된 타입, 누락 필드, 범위 초과 데이터 생성 → 모두 검증 실패 확인
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 2.3 Property 테스트: 분석 요청 라운드트립
    - **Property 13: 분석 요청 라운드트립**
    - fast-check로 유효한 요청 데이터 생성 → serialize(parse(json)) 재파싱 시 원본과 동일 확인
    - **Validates: Requirements 9.1, 9.3**

  - [ ]* 2.4 Property 테스트: 분석 응답 라운드트립
    - **Property 14: 분석 응답 라운드트립**
    - fast-check로 유효한 응답 데이터 생성 → parse(serialize(model)) 재직렬화 시 원본과 동일 확인
    - **Validates: Requirements 9.2, 9.4**

- [x] 3. Rule Engine — Risk Calculator 구현
  - [x] 3.1 Risk Calculator 구현 (`src/rule-engine/risk-calculator.ts`)
    - `calculateRiskScore(position, allPositions, marketData)` 함수 구현
    - Leverage Risk: `leverage <= 3 → 0`, `<= 10 → 1`, `> 10 → 2`
    - Liquidation Risk: `distance > 20% → 0`, `> 10% → 1`, `<= 10% → 2`
    - Volatility Risk: `volatility * leverage` 기반 구간 매핑
    - Funding Crowd Risk: 펀딩 방향과 포지션 방향 일치 시 가중
    - Concentration Risk: `positionMargin / totalMargin` 비율 기반
    - 5가지 요소 합산 → 1~10 척도 매핑
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.2 Property 테스트: Risk Score 불변
    - **Property 1: Risk Score 불변 — 요소 범위 및 합산**
    - fast-check로 유효한 OpenPosition + MarketData 생성 → 각 요소 0~2, totalScore 1~10 확인
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

- [x] 4. Rule Engine — S/R Calculator 구현
  - [x] 4.1 S/R Calculator 구현 (`src/rule-engine/sr-calculator.ts`)
    - `calculateSupportResistance(candles7d, candles30d, recentCandles)` 함수 구현
    - 7일/30일 High/Low 산출
    - VWAP 산출: `sum(typicalPrice × volume) / sum(volume)`
    - Pivot Point, R1, S1 산출
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Property 테스트: S/R High/Low 정확성
    - **Property 2: S/R High/Low 정확성**
    - fast-check로 캔들 데이터 생성 → shortTermHigh/Low가 7일 실제 최고/최저와 일치 확인
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 4.3 Property 테스트: VWAP 계산 정확성
    - **Property 3: VWAP 계산 정확성**
    - fast-check로 캔들 데이터 생성 → vwap == sum(typicalPrice × volume) / sum(volume) 확인
    - **Validates: Requirements 3.4**

  - [ ]* 4.4 Property 테스트: Pivot Level 계산 정확성
    - **Property 4: Pivot Level 계산 정확성**
    - fast-check로 H, L, C 생성 → pivotPoint, R1, S1 공식 일치 확인
    - **Validates: Requirements 3.5**

- [x] 5. Rule Engine — Funding Analyzer 구현
  - [x] 5.1 Funding Analyzer 구현 (`src/rule-engine/funding-analyzer.ts`)
    - `analyzeFunding(currentRate, rateHistory30d, rateHistory1h, rateHistory4h, rateHistory24h)` 함수 구현
    - 1h/4h/24h 추세 판별 (rising/falling/stable)
    - Z-Score 산출: `(currentRate - mean) / stddev`
    - Mean Reversion 판별: `|zScore| >= 2 → "높음"`
    - Extreme Signal 판별: `rate >= 0.001 → "극단 펀딩: 롱 과밀"`, `rate <= -0.001 → "극단 펀딩: 숏 과밀"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.2 Property 테스트: Funding 추세 판별 정확성
    - **Property 5: Funding 추세 판별 정확성**
    - fast-check로 펀딩 히스토리 생성 → 시작/끝 값 관계에 따른 추세 판별 확인
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 5.3 Property 테스트: Z-Score 계산 정확성
    - **Property 6: Z-Score 계산 정확성**
    - fast-check로 현재 레이트 + 30일 히스토리 생성 → zScore == (current - mean) / stddev 확인
    - **Validates: Requirements 4.3**

  - [ ]* 5.4 Property 테스트: Extreme Signal 판별 정확성
    - **Property 7: Extreme Signal 판별 정확성**
    - fast-check로 펀딩 레이트 생성 → ±0.001 기준 extremeSignal 판별 확인
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 5.5 Property 테스트: Mean Reversion 판별 정확성
    - **Property 8: Mean Reversion 판별 정확성**
    - fast-check로 zScore 생성 → |zScore| >= 2이면 "높음" 확인
    - **Validates: Requirements 4.4**

- [x] 6. Rule Engine — OI Analyzer 구현
  - [x] 6.1 OI Analyzer 구현 (`src/rule-engine/oi-analyzer.ts`)
    - `analyzeOI(currentOI, previousOI, currentPrice, previousPrice, spikeThreshold?)` 함수 구현
    - 가격/OI 변화 조합에 따른 4가지 시나리오 판별
    - OI Spike 감지: `|변화율| >= 5%`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 6.2 Property 테스트: OI 시나리오 판별 정확성
    - **Property 9: OI 시나리오 판별 정확성**
    - fast-check로 가격/OI 변화 생성 → 4가지 시나리오 매핑 확인
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

  - [ ]* 6.3 Property 테스트: OI Spike 감지 정확성
    - **Property 10: OI Spike 감지 정확성**
    - fast-check로 이전/현재 OI 생성 → 5% 임계값 기준 isSpike 확인
    - **Validates: Requirements 5.6**

- [x] 7. Rule Engine — Liquidation Analyzer 구현
  - [x] 7.1 Liquidation Analyzer 구현 (`src/rule-engine/liquidation-analyzer.ts`)
    - `analyzeLiquidationClusters(currentPrice, marketData, warningThreshold?)` 함수 구현
    - 롱/숏 청산 클러스터 가격대 산출
    - 근접 경고: 현재 가격 ±2% 이내 클러스터 존재 시 `nearbyWarning: true`
    - `nearbyClusterSide` 판별 (long/short/both/null)
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 7.2 Property 테스트: Liquidation 클러스터 근접 경고 정확성
    - **Property 11: Liquidation 클러스터 근접 경고 정확성**
    - fast-check로 현재 가격 + 클러스터 가격 생성 → ±2% 이내 시 nearbyWarning == true 확인
    - **Validates: Requirements 6.5**

- [x] 8. Checkpoint — Rule Engine 모듈 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Market Data Service 구현
  - [x] 9.1 Hyperliquid API 클라이언트 구현 (`src/data/hyperliquid-client.ts`)
    - `getPrice`, `getCandles`, `getFundingRate`, `getFundingHistory`, `getOpenInterest`, `getMarketMeta` 메서드 구현
    - Hyperliquid REST API 호출 로직
    - _Requirements: 7.1_

  - [x] 9.2 Redis 캐시 레이어 구현 (`src/data/cache.ts`)
    - 캐시 키 구조: `pdex:{dataType}:{symbol}:{params}`
    - TTL 기반 캐시 읽기/쓰기
    - 캐시 히트/미스 로직
    - _Requirements: 7.2, 7.3_

  - [x] 9.3 Market Data Service 통합 구현 (`src/data/market-data-service.ts`)
    - `MarketDataService` 클래스: 캐시 우선 조회 → 미스 시 Hyperliquid API 호출 → 캐시 저장
    - Hyperliquid API 실패 시 캐시 fallback 로직
    - `dataFreshness` 정보 추적 (live/cached + cachedAt)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.4 Property 테스트: 캐시 Fallback 시 데이터 시점 명시
    - **Property 16: 캐시 Fallback 시 데이터 시점 명시**
    - Hyperliquid API mock 실패 + 캐시 존재 시 → `dataFreshness.source == "cached"`, `cachedAt != null` 확인
    - **Validates: Requirements 7.4**

- [x] 10. PostgreSQL 데이터 레이어 구현
  - [x] 10.1 DB 스키마 및 리포지토리 구현 (`src/data/db.ts`)
    - PostgreSQL 연결 풀 설정 (pg Pool)
    - `analysis_history`, `funding_rate_history`, `oi_history` 테이블 SQL 마이그레이션
    - 분석 결과 저장, 펀딩 히스토리 조회/저장, OI 히스토리 조회/저장 함수 구현
    - DB 실패 시 에러 로깅 후 계속 진행 로직
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 11. AI Engine 구현
  - [x] 11.1 Prompt Builder 구현 (`src/ai-engine/prompt-builder.ts`)
    - Rule Engine 결과를 LLM 프롬프트로 변환하는 함수 구현
    - 포지션 종합 분석, 펀딩 단독, OI 단독, Liquidation 단독 프롬프트 템플릿
    - _Requirements: 1.3, 2.8, 3.6, 4.7, 5.7, 6.4_

  - [x] 11.2 LLM Client 구현 (`src/ai-engine/llm-client.ts`)
    - OpenAI API 호출 래퍼 (모델: gpt-4o-mini 기본, 설정 가능)
    - 응답 파싱 → `AIInterpretation` 타입으로 변환
    - 호출 실패 시 `null` 반환 (Graceful Degradation)
    - _Requirements: 1.3, 1.5_

  - [x] 11.3 AI Engine 통합 (`src/ai-engine/index.ts`)
    - `AIEngine.interpret(ruleResults)` 메서드: Prompt Builder → LLM Client → 결과 반환
    - 에러 핸들링: LLM 실패 시 `null` 반환
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 12. Analysis Orchestrator 구현
  - [x] 12.1 Orchestrator 구현 (`src/orchestrator/index.ts`)
    - 포지션 종합 분석 파이프라인: Market Data 조회 → Rule Engine 5개 모듈 병렬 실행 (`Promise.all`) → AI Engine 호출 → 결과 조합
    - 펀딩/OI/Liquidation 단독 분석 파이프라인
    - AI Engine 실패 시 `aiInterpretation: null`로 fallback
    - PostgreSQL 비동기 저장 (fire-and-forget, 실패 시 로그만)
    - 10초 타임아웃 처리
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 8.4, 10.1, 10.5_

  - [ ]* 12.2 Property 테스트: AI 실패 시 Graceful Degradation
    - **Property 15: AI 실패 시 Graceful Degradation**
    - AI Engine mock 실패 설정 → 응답의 `ruleEngine` 필드 존재 + `aiInterpretation == null` 확인
    - **Validates: Requirements 1.4, 1.5**

  - [ ]* 12.3 Property 테스트: DB 실패 시 분석 계속 수행
    - **Property 17: DB 실패 시 분석 계속 수행**
    - PostgreSQL mock 실패 설정 → 응답 `success == true`, `ruleEngine` 필드 존재 확인
    - **Validates: Requirements 10.5**

- [ ] 13. REST API Layer 구현
  - [x] 13.1 Express 라우터 및 미들웨어 구현 (`src/api/`)
    - `POST /api/v1/analysis/position` — 포지션 종합 분석
    - `POST /api/v1/analysis/funding` — 펀딩 단독 분석
    - `POST /api/v1/analysis/oi` — OI 단독 분석
    - `POST /api/v1/analysis/liquidation` — Liquidation 단독 분석
    - `GET /api/v1/health` — 서버 상태 확인 (Redis, PostgreSQL, Hyperliquid 연결 상태)
    - 글로벌 에러 핸들러: `ErrorResponse` 형식 통일
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

  - [x] 13.2 서버 엔트리포인트 구현 (`src/index.ts`)
    - Express 앱 생성, 미들웨어 등록, 라우터 마운트
    - Redis/PostgreSQL 연결 초기화
    - 서버 시작 로직
    - _Requirements: 1.1_

- [x] 14. Checkpoint — 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. 통합 테스트
  - [ ]* 15.1 API 엔드포인트 통합 테스트
    - Supertest를 사용한 각 엔드포인트 정상 요청/응답 흐름 테스트
    - 검증 실패 시 400 응답 테스트
    - Hyperliquid/AI/DB mock을 통한 전체 파이프라인 테스트
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

- [x] 16. Final Checkpoint — 전체 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 표시된 태스크는 선택적이며 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 특정 요구사항을 참조하여 추적 가능합니다
- Property 테스트는 fast-check를 사용하며 최소 100회 반복합니다
- Rule Engine 모듈은 순수 함수로 구현하여 외부 의존성 없이 단위 테스트 가능합니다
- Checkpoint에서 모든 테스트 통과를 확인한 후 다음 단계로 진행합니다
