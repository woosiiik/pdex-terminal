# PDEX Terminal Web

Hyperliquid 퍼프 DEX 트레이딩 터미널 프론트엔드. Next.js 15 + React 19 + TailwindCSS 4 기반.

실시간 WebSocket으로 포지션/주문/캔들/오더북 데이터를 수신하고, WAS 분석 서버와 연동하여 AI Copilot 분석 결과를 표시한다.

## 목차

- [사전 요구사항](#사전-요구사항)
- [로컬 실행](#로컬-실행)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [환경 변수](#환경-변수)
- [관련 문서](#관련-문서)
- [배포](#배포)

## 사전 요구사항

- Node.js >= 20
- [PDEX Analysis Server](../pdex-terminal-was) 실행 중 (포지션/오더 분석용)

## 로컬 실행

### 1. 환경 변수 설정

```bash
cp .env.example .env.local
```

### 2. 의존성 설치 및 개발 서버 실행

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 실행된다.

## 주요 기능

| 영역 | 설명 |
|------|------|
| TopBar | 지갑 주소 입력, 코인 선택, 포지션/오더 모드 전환, 타임프레임 선택 |
| PortfolioPanel | 계좌 잔고, 보유 포지션, 미체결 주문 목록 |
| MarketPanel | TradingView 스타일 캔들 차트 + 오더북 뎁스 차트 |
| AICopilotPanel | Rule Engine + AI 기반 포지션/오더 분석 (리스크, 펀딩, OI, 청산, 전략, 체결, 집중도, 영향) |
| BottomBar | 알림 로그 (리사이즈 가능) |

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TailwindCSS 4
- **상태 관리**: Zustand
- **차트**: lightweight-charts (TradingView)
- **실시간 데이터**: Hyperliquid WebSocket API
- **분석 서버 연동**: REST API (PDEX Analysis Server)

## 프로젝트 구조

```
src/
├── app/           # Next.js App Router (layout, page)
├── components/    # UI 컴포넌트 (TopBar, MarketPanel, AICopilotPanel 등)
├── hooks/         # Custom hooks (useWebSocket)
├── lib/           # API 클라이언트 (hyperliquid-api, analysis-api, types)
└── stores/        # Zustand 전역 상태
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_HL_API_URL` | Hyperliquid REST API URL | `https://api.hyperliquid.xyz` |
| `NEXT_PUBLIC_HL_WS_URL` | Hyperliquid WebSocket URL | `wss://api.hyperliquid.xyz/ws` |
| `NEXT_PUBLIC_WAS_URL` | WAS 분석 서버 URL | `http://localhost:4000` |

## 관련 문서

- [AI Copilot 포지션 분석](docs/ai-copilot-position-analysis.md)
- [AI Copilot 오더 분석](docs/ai-copilot-order-analysis.md)

## 배포

> TODO: Vercel / Docker 배포 가이드 추가 예정
