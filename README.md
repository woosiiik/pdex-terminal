# PDEX Terminal

Hyperliquid 퍼프 DEX 트레이딩 터미널. AI Copilot이 포지션/오더를 실시간 분석해준다.

## 목차

- [프로젝트 구조](#프로젝트-구조)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [빠른 시작](#빠른-시작)
- [환경 변수](#환경-변수)
- [문서](#문서)

## 프로젝트 구조

```
pdex-terminal/
├── pdex-terminal-web/   # Next.js 프론트엔드 (포트 3000)
├── pdex-terminal-was/   # Node.js 분석 서버 (포트 4000)
└── README.md
```

| 모듈 | 설명 | 상세 |
|------|------|------|
| [pdex-terminal-web](./pdex-terminal-web) | 트레이딩 터미널 UI | Next.js 15, React 19, TailwindCSS 4, Zustand |
| [pdex-terminal-was](./pdex-terminal-was) | AI 분석 서버 | Express, Groq/Gemini/OpenAI, Redis, MySQL |

## 주요 기능

- 지갑 주소 기반 Hyperliquid 포지션/주문/잔고 실시간 조회 (WebSocket)
- TradingView 스타일 캔들 차트 + 오더북 뎁스 차트
- AI Copilot 포지션 분석: 리스크 스코어, S/R, 펀딩, OI, 청산 클러스터, 전략 조언(TP/SL)
- AI Copilot 오더 분석: 전략 탐지, 체결 가능성, 주문 집중도, 포지션 영향
- 코인 디스커버: 시장 데이터 기반 AI 코인 추천 (방향, TP/SL, 신뢰도)
- Rule Engine + LLM 역할 분리 (AI 실패 시 Rule Engine 결과 독립 표시)
- LLM 멀티 프로바이더 폴백: Groq → Gemini → OpenAI

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 15, React 19, TailwindCSS 4, Zustand, lightweight-charts |
| Backend | Node.js, Express, TypeScript |
| AI | Groq (Llama 3.3 70B), Gemini 2.0 Flash, OpenAI (GPT-4o-mini) |
| 데이터 | Hyperliquid REST/WebSocket API |
| 인프라 | Redis (캐시), MySQL (분석 이력), Docker Compose |

## 빠른 시작

### 1. 인프라 실행 (Redis)

```bash
cd pdex-terminal-was
docker compose up -d
```

> MySQL은 별도 설치 (127.0.0.1:3307). Docker Compose에는 Redis만 포함.

### 2. 분석 서버 실행

```bash
cd pdex-terminal-was
cp .env.example .env
# .env에서 GROQ_API_KEY 설정 (필수)
npm install
npm run dev
```

### 3. 프론트엔드 실행

```bash
cd pdex-terminal-web
cp .env.example .env.local
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 지갑 주소 입력 → 코인 선택 → 분석 시작.

## 환경 변수

### WAS (pdex-terminal-was/.env)

| 변수 | 설명 |
|------|------|
| `PORT` | 서버 포트 (기본 4000) |
| `GROQ_API_KEY` | Groq API 키 (필수, 1순위 LLM) |
| `GEMINI_API_KEY` | Google Gemini API 키 (2순위 폴백) |
| `OPENAI_API_KEY` | OpenAI API 키 (3순위 폴백) |
| `MYSQL_*` | MySQL 접속 정보 |
| `REDIS_*` | Redis 접속 정보 |

### Web (pdex-terminal-web/.env.local)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_HL_API_URL` | Hyperliquid REST API URL |
| `NEXT_PUBLIC_HL_WS_URL` | Hyperliquid WebSocket URL |
| `NEXT_PUBLIC_WAS_URL` | WAS 분석 서버 URL |

## 문서

- [WAS API 규격](./pdex-terminal-was/docs/api-spec.md)
- [AI Copilot 포지션 분석](./pdex-terminal-web/docs/ai-copilot-position-analysis.md)
- [AI Copilot 오더 분석](./pdex-terminal-web/docs/ai-copilot-order-analysis.md)
