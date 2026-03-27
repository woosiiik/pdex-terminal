# 구현 태스크

## 태스크 목록

- [x] 1. 프로젝트 초기 설정
  - [x] 1.1 Next.js 15 프로젝트 생성 및 의존성 설치
  - [x] 1.2 Tailwind CSS 4, Zustand, lightweight-charts 설치
  - [x] 1.3 환경 변수 설정 (.env.local)
  - [x] 1.4 글로벌 스타일 (다크 테마) 설정
- [x] 2. 타입 정의 및 Zustand 스토어
  - [x] 2.1 lib/types.ts — 모든 타입 정의
  - [x] 2.2 stores/useStore.ts — Zustand 스토어 구현
- [x] 3. Hyperliquid API 클라이언트
  - [x] 3.1 lib/hyperliquid-api.ts — REST API 클라이언트
  - [x] 3.2 lib/hyperliquid-ws.ts — WebSocket 클라이언트
  - [x] 3.3 hooks/useWebSocket.ts — WebSocket 커스텀 훅
- [x] 4. WAS Analysis API 클라이언트
  - [x] 4.1 lib/analysis-api.ts — 분석 서버 API 클라이언트
- [x] 5. 레이아웃 및 TopBar
  - [x] 5.1 app/layout.tsx — 루트 레이아웃
  - [x] 5.2 components/TopBar.tsx — 상단 바 (지갑 입력, 검증, Risk Score)
  - [x] 5.3 app/page.tsx — 메인 페이지 (3패널 레이아웃)
- [x] 6. PortfolioPanel (좌측)
  - [x] 6.1 components/PortfolioPanel.tsx — 계정 요약, 포지션, 오더 목록
- [x] 7. MarketPanel (중앙)
  - [x] 7.1 components/MarketPanel.tsx — 마켓 헤더, 차트, 오더북
- [x] 8. AICopilotPanel (우측)
  - [x] 8.1 components/AICopilotPanel.tsx — AI 분석 탭 (리스크, 펀딩, OI, 청산, 제안)
- [x] 9. BottomBar (하단)
  - [x] 9.1 components/BottomBar.tsx — 알림 탭
- [x] 10. 통합 및 데이터 연결
  - [x] 10.1 WebSocket 연결 + 스토어 바인딩
  - [x] 10.2 포지션 선택 → WAS 분석 요청 연동
  - [x] 10.3 Empty State (미연결 상태) 구현
