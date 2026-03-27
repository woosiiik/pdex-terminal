---
inclusion: fileMatch
fileMatchPattern: "pdex-terminal-was/**"
---

# Node.js Backend Patterns

WAS(pdex-terminal-was) 코드 작업 시 적용되는 백엔드 패턴 가이드.

## 아키텍처

Layered Architecture를 따른다:
- `src/api/` : HTTP 요청/응답 처리 (Controller 역할)
- `src/orchestrator/` : 비즈니스 로직 조합 (Service 역할)
- `src/rule-engine/` : 정량 분석 모듈 (순수 함수)
- `src/ai-engine/` : LLM 호출 및 응답 파싱
- `src/data/` : 데이터 접근 (DB, Cache, 외부 API)
- `src/config/` : 환경 설정
- `src/types/` : TypeScript 타입 정의
- `src/validators/` : Zod 기반 입력 검증

## 에러 처리

- API 라우터에서 try/catch로 에러를 잡고 `handleError()` 헬퍼로 분류
- 타임아웃: HTTP 504 + `ANALYSIS_TIMEOUT`
- 마켓 데이터 실패: HTTP 503 + `MARKET_DATA_UNAVAILABLE`
- LLM 실패: HTTP 503 + `LLM_UNAVAILABLE` (Rule Engine 결과는 독립 반환)
- 기타: HTTP 500 + `INTERNAL_ERROR`

## 입력 검증

- Zod 스키마로 요청 body 검증 (`src/validators/index.ts`)
- `validate()` 미들웨어를 라우터에 적용

## 캐싱

- Redis를 통한 마켓 데이터 캐싱 (`src/data/cache.ts`)
- `fetchWithCache()` 패턴: API 호출 → 성공 시 캐시 갱신, 실패 시 캐시 폴백
- TTL: price 5초, candles 60초, funding 30초, OI 30초, meta 300초

## DB 패턴

- mysql2/promise 커넥션 풀 (connectionLimit: 10)
- `runMigrations()`에서 CREATE TABLE IF NOT EXISTS + 컬럼 존재 여부 체크 후 ALTER TABLE
- fire-and-forget 패턴으로 분석 결과 비동기 저장 (`.catch()`)

## 타임아웃

- `withTimeout()` 헬퍼로 분석 파이프라인에 30초 타임아웃 적용
- 클라이언트도 30초 타임아웃 동기화

## LLM 호출

- 멀티 프로바이더 폴백: Claude Sonnet 4 → Groq → Gemini → OpenAI
- `callLLM()`은 `{ text, model }` 반환 (사용된 모델 추적)
- JSON 응답 파싱 시 `extractJSON()`으로 마크다운 코드블록 제거
- AI 실패 시 graceful degradation (Rule Engine 결과만 반환)

## 요청 로깅

- API 라우터에 미들웨어로 요청/응답 로깅
- `→ METHOD /path body(200자)` + `← METHOD /path status (duration)`

## 코드 스타일

- ESM 모듈, import 경로에 `.js` 확장자 필수
- `as const` 활용한 config 객체
- async/await 기반, Promise.all로 병렬 처리
- 타입은 `src/types/index.ts`에 중앙 관리
