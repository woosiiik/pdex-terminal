# PDEX Terminal Web — 기술 설계 문서

## 1. 개요

PDEX Terminal Web은 Next.js 15 (App Router) 기반의 프론트엔드 애플리케이션으로, Hyperliquid P-DEX 사용자의 포트폴리오 모니터링 및 AI 분석 결과를 실시간으로 표시한다.

## 2. 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| Framework | Next.js 15 (App Router) | SSR/SSG, 파일 기반 라우팅 |
| Language | TypeScript | 타입 안전성 |
| Styling | Tailwind CSS 4 | 유틸리티 기반, 다크 테마 |
| State | Zustand | 경량 전역 상태 관리 |
| Chart | lightweight-charts (TradingView) | 금융 차트 전문 라이브러리 |
| HTTP | fetch (내장) | 추가 의존성 불필요 |
| WebSocket | 네이티브 WebSocket | Hyperliquid WS 직접 연결 |

## 3. 프로젝트 구조

```
pdex-terminal-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── page.tsx            # 메인 페이지
│   │   └── globals.css         # 글로벌 스타일
│   ├── components/
│   │   ├── TopBar.tsx          # 상단 바 (지갑 입력, Risk Score)
│   │   ├── PortfolioPanel.tsx  # 좌측 패널 (포트폴리오, 포지션, 오더)
│   │   ├── MarketPanel.tsx     # 중앙 패널 (차트, 오더북)
│   │   ├── AICopilotPanel.tsx  # 우측 패널 (AI 분석)
│   │   └── BottomBar.tsx       # 하단 바 (알림)
│   ├── stores/
│   │   └── useStore.ts         # Zustand 스토어
│   ├── lib/
│   │   ├── hyperliquid-ws.ts   # Hyperliquid WebSocket 클라이언트
│   │   ├── hyperliquid-api.ts  # Hyperliquid REST API 클라이언트
│   │   ├── analysis-api.ts     # WAS API 클라이언트
│   │   └── types.ts            # 타입 정의
│   └── hooks/
│       └── useWebSocket.ts     # WebSocket 커스텀 훅
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── postcss.config.mjs
```

## 4. 데이터 흐름

```
[Hyperliquid WebSocket] ──→ [useWebSocket Hook] ──→ [Zustand Store] ──→ [UI Components]
                                                          ↑
[Hyperliquid REST API] ──→ [폴링 (10초)] ────────────────┘
                                                          ↑
[WAS Analysis API] ──→ [포지션 선택 시 요청] ─────────────┘
```

### 4.1 WebSocket 구독 채널

| 채널 | 데이터 | 용도 |
|------|--------|------|
| `webData2` | userState (positions, orders, balances) | 포트폴리오, 포지션, 오더 |
| `l2Book` | orderbook snapshots | 오더북 |
| `candle` | OHLCV candles | 차트 |
| `allMids` | mid prices | 실시간 가격 |

### 4.2 REST API 폴링

- `/info` (POST) — clearinghouseState: 포트폴리오 요약 (10초 간격)
- `/info` (POST) — candleSnapshot: 차트 초기 데이터
- `/info` (POST) — fundingHistory: 펀딩 히스토리

### 4.3 WAS API 호출

- `POST /api/v1/analysis/position` — 포지션 선택 시 종합 분석
- `POST /api/v1/analysis/funding` — 코인 선택 시 펀딩 분석
- `POST /api/v1/analysis/oi` — 코인 선택 시 OI 분석
- `POST /api/v1/analysis/liquidation` — 코인 선택 시 청산 분석

## 5. 컴포넌트 설계

### 5.1 TopBar
- 지갑 주소 입력 + 검증 (0x, 42자)
- 거래소 선택 드롭다운 (MVP: Hyperliquid만 활성)
- 연결 상태 표시
- 전체 Risk Score 배지

### 5.2 PortfolioPanel (좌측 280px)
- 계정 요약: 총 자산, 미실현 PnL, 마진 사용률
- 기간별 실현 PnL/Volume (24h, 7D, 30D, All)
- 오픈 포지션 카드 목록 (클릭 → 코인 선택)
- 오픈 오더 카드 목록

### 5.3 MarketPanel (중앙, flex-1)
- 마켓 헤더: 코인명, Mark/Oracle 가격, 24h 변화, Volume, OI, Funding
- 타임프레임 선택 바 (1m, 5m, 15m, 1H, 4H, 1D)
- TradingView lightweight-charts 캔들스틱 차트
- 오더북 (매도/매수 호가, 스프레드)

### 5.4 AICopilotPanel (우측 320px)
- 포지션 선택 시: 리스크, 펀딩, OI, 청산, 제안 탭
- 오더 선택 시: 전략, 체결, 집중도, 영향, 제안 탭 (MVP 제외)
- 로딩 상태: "분석 중..." 스켈레톤
- AI 실패 시: Rule Engine 결과만 표시

### 5.5 BottomBar (하단 120px)
- 알림 탭: 펀딩 경고, 청산 근접 등
- Trade Journal 탭 (MVP: 빈 상태)

## 6. 상태 관리 (Zustand)

```typescript
interface AppState {
  // 연결
  walletAddress: string | null;
  isConnected: boolean;
  
  // 포트폴리오
  accountSummary: AccountSummary | null;
  positions: Position[];
  orders: Order[];
  
  // 마켓
  selectedCoin: string | null;
  orderbook: OrderbookData | null;
  candles: CandleData[];
  allMids: Record<string, string>;
  
  // AI 분석
  positionAnalysis: PositionAnalysisResponse | null;
  analysisLoading: boolean;
  
  // 알림
  alerts: Alert[];
}
```

## 7. 환경 변수

```
NEXT_PUBLIC_WAS_URL=http://localhost:4000
NEXT_PUBLIC_HL_WS_URL=wss://api.hyperliquid.xyz/ws
NEXT_PUBLIC_HL_API_URL=https://api.hyperliquid.xyz
```
