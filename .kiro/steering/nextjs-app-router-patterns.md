---
inclusion: fileMatch
fileMatchPattern: "pdex-terminal-web/**"
---

# Next.js App Router Patterns

Web(pdex-terminal-web) 코드 작업 시 적용되는 프론트엔드 패턴 가이드.

## 렌더링 모드

- 기본은 Server Component. `'use client'`는 인터랙션, hooks, 브라우저 API가 필요할 때만 추가
- 이 프로젝트는 실시간 트레이딩 터미널이라 대부분의 컴포넌트가 Client Component (`'use client'`)

## 파일 구조

```
src/
├── app/
│   ├── layout.tsx      # 루트 레이아웃
│   ├── page.tsx        # 메인 페이지 (EmptyState / ConnectedLayout)
│   ├── globals.css     # TailwindCSS 글로벌 스타일
│   └── icon.svg        # 파비콘
├── components/         # UI 컴포넌트
│   ├── TopBar.tsx      # 상단 바 (로고, 거래소, 지갑, 모드 표시)
│   ├── PortfolioPanel.tsx  # 좌측 패널 (추천 버튼, 자산, 포지션, 오더)
│   ├── MarketPanel.tsx     # 중앙 (차트, 오더북)
│   ├── AICopilotPanel.tsx  # 우측 (포지션/오더 AI 분석)
│   ├── DiscoverPanel.tsx   # 우측 (AI 코인 추천)
│   └── BottomBar.tsx       # 하단 알림
├── hooks/
│   └── useWebSocket.ts # Hyperliquid WebSocket 연결
├── lib/
│   ├── analysis-api.ts # WAS REST API 클라이언트
│   ├── hyperliquid-api.ts  # Hyperliquid REST API
│   ├── hyperliquid-ws.ts   # WebSocket 메시지 파싱
│   └── types.ts        # 공유 타입 정의
└── stores/
    └── useStore.ts     # Zustand 단일 스토어
```

## 상태 관리

- Zustand 단일 스토어 (`useStore.ts`)
- 선택적 구독: `useStore((s) => s.selectedCoin)` 패턴으로 리렌더 최소화
- 비동기 액션은 스토어 내부에서 처리 (예: `fetchDiscoverRecommendations`)

## 컴포넌트 패턴

- `'use client'` 디렉티브는 파일 최상단에
- 컴포넌트 내부 서브 컴포넌트는 같은 파일에 정의 (파일 분리 최소화)
- 인라인 스타일 + TailwindCSS 혼용 (다크 테마 세밀 제어)
- 보라색(#A78BFA) 액센트, 초록(#3fb950) 롱/상승, 빨강(#f85149) 숏/하락

## API 호출

- `src/lib/analysis-api.ts`에서 WAS API 호출
- `NEXT_PUBLIC_WAS_URL` 환경변수 (빌드 타임 결정)
- 30초 타임아웃, AbortController 사용
- 에러 시 스토어의 `alerts`에 추가

## 실시간 데이터

- WebSocket으로 포지션, 오더, 캔들, 오더북 실시간 수신
- `useWebSocket` 커스텀 훅에서 연결 관리
- 캔들 초기 데이터는 REST로 가져오고, 이후 WS로 업데이트

## 주의사항

- `NEXT_PUBLIC_*` 환경변수는 빌드 타임에 번들에 박힘 (런타임 변경 불가)
- Docker 빌드 시 `ARG`로 받아서 `ENV`로 전달
- `output: "standalone"` 설정으로 Docker 이미지 경량화
