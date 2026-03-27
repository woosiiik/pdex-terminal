# Implementation Plan: 코인 추천 (Coin Discover)

## Overview

기존 포지션/오더 분석 아키텍처 패턴을 따라 Discover 모드를 추가한다. WAS에서 Hyperliquid 전체 마켓 데이터를 수집하고 LLM(Groq)으로 3~5개 코인 추천을 생성한 뒤, FE에서 카드 목록으로 렌더링한다. 기존 기능과의 호환성을 유지하면서 TopBar 모드 토글로 전환한다.

## Tasks

- [x] 1. WAS 타입 정의 및 Hyperliquid 클라이언트 확장
  - [x] 1.1 WAS 타입 추가 (`pdex-terminal-was/src/types/index.ts`)
    - `AssetCtx`, `MarketCoinSummary`, `DiscoverRecommendation`, `DiscoverResponse` 인터페이스 추가
    - _Requirements: 3.3, 4.2_
  - [x] 1.2 Hyperliquid 클라이언트에 `getMetaAndAssetCtxs` 함수 추가 (`pdex-terminal-was/src/data/hyperliquid-client.ts`)
    - `postInfo({ type: "metaAndAssetCtxs" })` 호출하여 `[MarketMeta, AssetCtx[]]` 반환
    - _Requirements: 4.1_
  - [x] 1.3 마켓 데이터 가공 함수 `buildMarketSummary` 구현 (`pdex-terminal-was/src/data/hyperliquid-client.ts`)
    - `meta.universe[i].name`과 `assetCtxs[i]`를 인덱스 매칭하여 `MarketCoinSummary[]` 생성
    - `changePercent24h = ((markPx - prevDayPx) / prevDayPx) * 100` 계산
    - _Requirements: 4.2, 4.3_

- [x] 2. WAS AI 엔진 — Discover 프롬프트 및 추천 생성
  - [x] 2.1 Discover 프롬프트 빌더 추가 (`pdex-terminal-was/src/ai-engine/prompt-builder.ts`)
    - `buildDiscoverPrompt(marketSummary: MarketCoinSummary[])` 함수 추가
    - system: 암호화폐 단기 트레이딩 추천 전문가 역할
    - user: 전체 코인 마켓 데이터 테이블 + JSON 배열 응답 형식 지정 (coin, direction, tp, sl, confidence, reason)
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 2.2 `generateDiscoverRecommendations` 함수 추가 (`pdex-terminal-was/src/ai-engine/index.ts`)
    - `buildDiscoverPrompt` → `callLLM` → JSON 파싱 → `DiscoverRecommendation[] | null` 반환
    - 유효하지 않은 JSON이면 `null` 반환
    - _Requirements: 5.4, 5.5, 5.6_

- [x] 3. WAS 오케스트레이터 및 API 라우트
  - [x] 3.1 `analyzeDiscover` 오케스트레이터 함수 추가 (`pdex-terminal-was/src/orchestrator/index.ts`)
    - `getMetaAndAssetCtxs` → `buildMarketSummary` → `generateDiscoverRecommendations` → `enrichRecommendations` 파이프라인
    - `withTimeout` 래핑 (config.analysisTimeout)
    - LLM 응답에 `currentPrice`, `changePercent24h` 보강 (마켓 데이터에서 매칭)
    - LLM 응답이 null이면 에러 throw
    - _Requirements: 3.2, 4.1, 5.6_
  - [x] 3.2 API 라우트 추가 (`pdex-terminal-was/src/api/index.ts`)
    - `POST /analysis/discover` 엔드포인트 추가
    - `handleError`에 LLM 실패 케이스 (`LLM_UNAVAILABLE`, 503) 추가
    - _Requirements: 3.1, 3.4, 3.5_

- [x] 4. Checkpoint — WAS 빌드 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. FE 타입 및 API 함수 추가
  - [x] 5.1 FE 타입 추가 (`pdex-terminal-web/src/lib/types.ts`)
    - `DiscoverRecommendation`, `DiscoverResponse` 인터페이스 추가
    - _Requirements: 3.3, 8.5_
  - [x] 5.2 Discover API 함수 추가 (`pdex-terminal-web/src/lib/analysis-api.ts`)
    - `analyzeDiscover()` 함수 — `post<DiscoverResponse>('/api/v1/analysis/discover', {})` 호출
    - _Requirements: 6.1_

- [x] 6. Store 확장 — Discover 상태 및 액션
  - [x] 6.1 Store 타입 및 상태 확장 (`pdex-terminal-web/src/stores/useStore.ts`)
    - `selectedMode` 타입을 `'discover' | 'position' | 'order' | null`로 확장
    - `discoverRecommendations: DiscoverRecommendation[] | null`, `discoverLoading: boolean`, `discoverLastUpdated: string | null` 상태 추가
    - `setDiscoverRecommendations`, `setDiscoverLoading`, `setDiscoverLastUpdated`, `fetchDiscoverRecommendations` 액션 추가
    - `fetchDiscoverRecommendations`: loading → API 호출 → 성공 시 recommendations + lastUpdated 업데이트 → 실패 시 addAlert + null → loading false
    - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. TopBar 모드 토글 UI
  - [x] 7.1 TopBar에 모드 토글 버튼 그룹 추가 (`pdex-terminal-web/src/components/TopBar.tsx`)
    - `추천 | 포지션 | 오더` 3버튼 수평 배치
    - `isConnected === true`일 때만 렌더링
    - 활성 버튼: `bg-[#58a6ff22] text-[#58a6ff]`, 비활성: `text-[#8b949e]`
    - 클릭 시 `setSelectedMode(value)` 호출
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 8. DiscoverPanel 컴포넌트 구현
  - [x] 8.1 DiscoverPanel 신규 생성 (`pdex-terminal-web/src/components/DiscoverPanel.tsx`)
    - Store에서 `discoverRecommendations`, `discoverLoading`, `discoverLastUpdated`, `selectedCoin` 구독
    - "새로운 추천 받기" 버튼 → `fetchDiscoverRecommendations()` 호출
    - 마지막 분석 시각 `마지막 분석: HH:MM:SS KST` 형식 표시
    - 로딩 중: 스켈레톤 UI 표시
    - 빈 데이터: "추천 데이터가 없습니다" 메시지 표시
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 2.8_
  - [x] 8.2 DiscoverCard 내부 컴포넌트 구현 (`pdex-terminal-web/src/components/DiscoverPanel.tsx` 내부)
    - 코인명, 방향 배지 (LONG=`bg-[#238636]`, SHORT=`bg-[#f85149]`), 현재가, 24h 변동률 표시
    - TP 초록색 박스, SL 빨간색 박스 (달러 형식)
    - 신뢰도 배지: high=초록 `신뢰도 높음`, medium=노란 `신뢰도 보통`, low=빨간 `신뢰도 낮음`
    - reason 텍스트: 11px 회색
    - 클릭 시 `setSelectedCoin(rec.coin)` + 선택 카드 강조 테두리 (`border-[#58a6ff] border-2`)
    - _Requirements: 2.2, 2.3, 2.4, 8.1, 8.2, 8.3, 8.4_

- [x] 9. page.tsx 패널 조건부 렌더링 및 기존 모드 호환
  - [x] 9.1 ConnectedLayout 오른쪽 패널 조건부 렌더링 (`pdex-terminal-web/src/app/page.tsx`)
    - `selectedMode === 'discover'` → `<DiscoverPanel />`, 그 외 → `<AICopilotPanel />`
    - _Requirements: 2.1, 7.1, 7.2_
  - [x] 9.2 Discover 모드 자동 API 호출 (`pdex-terminal-web/src/app/page.tsx`)
    - `selectedMode === 'discover'`로 변경 시 `fetchDiscoverRecommendations()` 호출하는 useEffect 추가
    - _Requirements: 6.1_
  - [x] 9.3 기존 포지션/오더 카드 클릭 시 모드 전환 확인
    - PortfolioPanel에서 포지션 클릭 → `selectedMode = 'position'`, 오더 클릭 → `selectedMode = 'order'` 동작 유지
    - _Requirements: 7.3, 7.4_

- [x] 10. Final checkpoint — 전체 빌드 및 기능 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP — 이 플랜에서는 PBT 스킵 요청에 따라 optional 테스트 태스크를 제외함
- Groq가 유일하게 동작하는 LLM이므로 Groq 우선 호출 로직은 기존 `callLLM` 그대로 활용
- 기존 `handleError`, `withTimeout`, `callLLM` 등 공통 유틸리티를 최대한 재사용
- 각 태스크는 이전 태스크의 결과물에 의존하므로 순서대로 진행
