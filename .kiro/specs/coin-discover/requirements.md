# Requirements Document

## Introduction

본 프로젝트는 코인 선물거래 Perp Aggregator 서비스인 Supercycl의 차기 고도화에 앞서, AI 기반 코인 추천 기능의 실현 가능성과 사용자 경험을 검증하기 위한 프로토타입이다. Calico Terminal에 "코인 추천(Discover)" 기능을 도입하여, LLM이 Hyperliquid 전체 마켓 데이터(`metaAndAssetCtxs`)를 실시간으로 분석하고 단기 트레이딩에 적합한 코인을 선별·추천한다. 사용자는 추천 카드를 통해 방향, 목표가, 손절가, 신뢰도를 한눈에 파악하고, 클릭 한 번으로 해당 코인의 차트로 전환할 수 있다. TopBar에 `추천 | 포지션 | 오더` 3개 모드 토글을 배치하여 기존 포지션·오더 분석 기능과 자연스럽게 공존하도록 설계한다.

## Glossary

- **Discover_Mode**: TopBar 모드 토글에서 "추천"을 선택한 상태. 오른쪽 패널이 코인 추천 카드 목록으로 전환된다.
- **Mode_Toggle**: TopBar에 위치한 `추천 | 포지션 | 오더` 3개 버튼 그룹. 현재 활성 모드를 시각적으로 표시한다.
- **Discover_Card**: 추천된 코인 1건의 정보를 표시하는 UI 카드. 코인명, 방향, 현재가, TP, SL, 신뢰도, 추천 사유를 포함한다.
- **Discover_API**: WAS의 `POST /api/v1/analysis/discover` 엔드포인트. Hyperliquid 마켓 데이터를 수집하고 LLM에게 코인 추천을 요청한다.
- **Discover_Panel**: Discover_Mode 활성 시 오른쪽 패널(기존 AICopilotPanel 위치)에 렌더링되는 코인 추천 목록 UI.
- **Market_Data_Fetcher**: WAS에서 Hyperliquid `metaAndAssetCtxs` API를 호출하여 전체 코인의 가격, 펀딩 레이트, OI, 거래량 등을 수집하는 모듈.
- **Recommendation**: LLM이 반환하는 단일 코인 추천 객체. coin, direction, currentPrice, tp, sl, confidence, reason 필드를 포함한다.
- **Confidence_Level**: 추천 신뢰도. "high", "medium", "low" 3단계로 구분한다.
- **Store**: Zustand 기반 프론트엔드 전역 상태 관리. selectedMode, discoverRecommendations 등의 상태를 관리한다.
- **LLM_Client**: WAS의 AI 엔진 모듈. Groq → Gemini → OpenAI 순서로 fallback하며 LLM을 호출한다.

## Requirements

### Requirement 1: 모드 토글 UI

**User Story:** As a 트레이더, I want TopBar에서 추천/포지션/오더 모드를 전환할 수 있기를, so that 원하는 분석 모드를 빠르게 선택할 수 있다.

#### Acceptance Criteria

1. THE Mode_Toggle SHALL 추천, 포지션, 오더 3개 버튼을 수평으로 배치하여 표시한다.
2. WHEN 사용자가 Mode_Toggle의 버튼을 클릭하면, THE Store SHALL selectedMode 상태를 해당 모드 값("discover", "position", "order")으로 업데이트한다.
3. WHILE selectedMode가 특정 값으로 설정된 상태에서, THE Mode_Toggle SHALL 해당 버튼을 활성 스타일(배경색 `#58a6ff22`, 텍스트색 `#58a6ff`)로 표시한다.
4. THE Store SHALL selectedMode 타입을 `'discover' | 'position' | 'order' | null`로 정의한다.
5. WHEN 지갑이 연결되지 않은 상태에서, THE Mode_Toggle SHALL 표시되지 않는다.

### Requirement 2: Discover 패널 UI

**User Story:** As a 트레이더, I want 추천 모드에서 AI가 추천한 코인 목록을 카드 형태로 볼 수 있기를, so that 단기 트레이딩 기회를 빠르게 파악할 수 있다.

#### Acceptance Criteria

1. WHILE selectedMode가 "discover"인 상태에서, THE Discover_Panel SHALL 오른쪽 패널 영역에 코인 추천 카드 목록을 렌더링한다.
2. THE Discover_Card SHALL 코인명, 방향(LONG/SHORT 배지), 현재가, 24시간 변동률, TP(목표가), SL(손절가), 신뢰도(high/medium/low 배지), 추천 사유를 표시한다.
3. WHEN 사용자가 Discover_Card를 클릭하면, THE Store SHALL selectedCoin을 해당 코인명으로 설정하여 차트를 전환한다.
4. WHEN 사용자가 Discover_Card를 클릭하면, THE Discover_Card SHALL 선택된 카드에 강조 테두리(border-color `#58a6ff`, border-width 2px)를 표시한다.
5. THE Discover_Panel SHALL "새로운 추천 받기" 버튼을 카드 목록 상단에 표시한다.
6. THE Discover_Panel SHALL 마지막 분석 시각을 "마지막 분석: HH:MM:SS KST" 형식으로 표시한다.
7. WHILE 추천 데이터가 로딩 중인 상태에서, THE Discover_Panel SHALL 로딩 스켈레톤 UI를 표시한다.
8. IF 추천 데이터가 비어 있으면, THEN THE Discover_Panel SHALL "추천 데이터가 없습니다" 메시지를 표시한다.

### Requirement 3: Discover API 엔드포인트

**User Story:** As a 프론트엔드 클라이언트, I want `POST /api/v1/analysis/discover` API를 호출하여 코인 추천 결과를 받을 수 있기를, so that LLM 기반 코인 추천을 사용자에게 제공할 수 있다.

#### Acceptance Criteria

1. THE Discover_API SHALL `POST /api/v1/analysis/discover` 경로에서 요청을 수신한다.
2. WHEN 유효한 요청을 수신하면, THE Discover_API SHALL 성공 응답으로 `{ success: true, timestamp: string, recommendations: Recommendation[] }` 형식의 JSON을 반환한다.
3. THE Recommendation SHALL `{ coin: string, direction: "LONG" | "SHORT", currentPrice: number, changePercent24h: number, tp: number, sl: number, confidence: "high" | "medium" | "low", reason: string }` 구조를 따른다.
4. IF Discover_API 처리 중 타임아웃(10초 초과)이 발생하면, THEN THE Discover_API SHALL HTTP 504 상태 코드와 `{ success: false, error: { code: "ANALYSIS_TIMEOUT", message: "분석 타임아웃" } }` 응답을 반환한다.
5. IF LLM 호출이 실패하면, THEN THE Discover_API SHALL HTTP 503 상태 코드와 `{ success: false, error: { code: "LLM_UNAVAILABLE", message: "AI 분석을 수행할 수 없습니다" } }` 응답을 반환한다.

### Requirement 4: 마켓 데이터 수집

**User Story:** As a WAS 서버, I want Hyperliquid `metaAndAssetCtxs` API에서 전체 코인의 마켓 데이터를 수집할 수 있기를, so that LLM에게 분석 대상 데이터를 제공할 수 있다.

#### Acceptance Criteria

1. WHEN Discover_API가 요청을 수신하면, THE Market_Data_Fetcher SHALL Hyperliquid `metaAndAssetCtxs` API를 호출하여 전체 코인의 메타데이터와 자산 컨텍스트를 수집한다.
2. THE Market_Data_Fetcher SHALL 각 코인에 대해 코인명, 현재가(markPx), 24시간 거래량(dayNtlVlm), 펀딩 레이트(funding), OI(openInterest), 전일 가격(prevDayPx)을 추출한다.
3. THE Market_Data_Fetcher SHALL 수집된 데이터에서 24시간 변동률을 `(markPx - prevDayPx) / prevDayPx * 100`으로 계산한다.
4. IF Hyperliquid API 호출이 실패하면, THEN THE Market_Data_Fetcher SHALL 에러를 상위 호출자에게 전파한다.

### Requirement 5: LLM 코인 추천 생성

**User Story:** As a WAS 서버, I want LLM에게 마켓 데이터를 전달하여 단기 트레이딩 추천을 받을 수 있기를, so that 데이터 기반의 코인 추천을 사용자에게 제공할 수 있다.

#### Acceptance Criteria

1. WHEN 마켓 데이터 수집이 완료되면, THE LLM_Client SHALL 수집된 마켓 데이터를 포함한 프롬프트를 구성하여 LLM을 호출한다.
2. THE LLM_Client SHALL LLM에게 3~5개의 코인 추천을 JSON 배열 형식으로 요청한다.
3. THE LLM_Client SHALL 각 추천에 대해 coin, direction, tp, sl, confidence, reason 필드를 포함하도록 프롬프트에 명시한다.
4. THE LLM_Client SHALL Groq를 우선 호출하고, 실패 시 Gemini, 그 다음 OpenAI 순서로 fallback한다.
5. IF LLM 응답이 유효한 JSON 배열이 아니면, THEN THE LLM_Client SHALL null을 반환한다.
6. THE LLM_Client SHALL LLM 응답을 파싱하여 Recommendation 배열로 변환한다.

### Requirement 6: 프론트엔드 API 연동

**User Story:** As a 프론트엔드 애플리케이션, I want Discover API를 호출하고 결과를 Store에 저장할 수 있기를, so that Discover_Panel이 추천 데이터를 렌더링할 수 있다.

#### Acceptance Criteria

1. WHEN selectedMode가 "discover"로 변경되면, THE Store SHALL Discover_API를 호출하여 추천 데이터를 가져온다.
2. WHEN Discover_API 응답이 성공이면, THE Store SHALL discoverRecommendations 상태를 응답의 recommendations 배열로 업데이트한다.
3. WHEN "새로운 추천 받기" 버튼을 클릭하면, THE Store SHALL Discover_API를 재호출하여 추천 데이터를 갱신한다.
4. WHILE Discover_API 호출이 진행 중인 상태에서, THE Store SHALL discoverLoading 상태를 true로 설정한다.
5. IF Discover_API 호출이 실패하면, THEN THE Store SHALL 에러 알림을 alerts에 추가하고 discoverRecommendations를 null로 설정한다.

### Requirement 7: 기존 모드 호환성

**User Story:** As a 트레이더, I want 기존 포지션/오더 분석 기능이 추천 모드 추가 후에도 동일하게 동작하기를, so that 기존 워크플로우가 영향받지 않는다.

#### Acceptance Criteria

1. WHILE selectedMode가 "position"인 상태에서, THE AICopilotPanel SHALL 기존 포지션 분석 탭(리스크, 펀딩, OI, 청산, 전략, 제안)을 표시한다.
2. WHILE selectedMode가 "order"인 상태에서, THE AICopilotPanel SHALL 기존 오더 분석 탭(전략, 체결, 집중도, 영향, 제안, 변경)을 표시한다.
3. WHEN PortfolioPanel에서 포지션 카드를 클릭하면, THE Store SHALL selectedMode를 "position"으로 설정하고 해당 코인의 차트를 표시한다.
4. WHEN PortfolioPanel에서 오더 카드를 클릭하면, THE Store SHALL selectedMode를 "order"로 설정하고 해당 코인의 차트를 표시한다.

### Requirement 8: Discover API 응답 파싱 및 표시

**User Story:** As a 프론트엔드 애플리케이션, I want Discover API 응답을 파싱하여 Discover_Card에 올바르게 표시할 수 있기를, so that 사용자가 정확한 추천 정보를 확인할 수 있다.

#### Acceptance Criteria

1. THE Discover_Panel SHALL Recommendation의 direction이 "LONG"이면 초록색 배지(`bg-[#238636]`)를, "SHORT"이면 빨간색 배지(`bg-[#f85149]`)를 표시한다.
2. THE Discover_Panel SHALL Recommendation의 confidence가 "high"이면 `신뢰도 높음`(초록), "medium"이면 `신뢰도 보통`(노란), "low"이면 `신뢰도 낮음`(빨간) 배지를 표시한다.
3. THE Discover_Panel SHALL TP 값을 초록색 박스에, SL 값을 빨간색 박스에 달러 형식으로 표시한다.
4. THE Discover_Panel SHALL reason 텍스트를 카드 하단에 11px 크기의 회색 텍스트로 표시한다.
5. FOR ALL 유효한 Recommendation 객체에 대해, 파싱 후 표시한 다음 다시 파싱하면 동일한 Recommendation 객체를 생성한다 (round-trip property).
