# PDEX Analysis Server

Open Position / Open Order 분석을 위한 Node.js + TypeScript 백엔드 서비스.

Hyperliquid 마켓 데이터 기반으로 Risk Score, Support/Resistance, Funding Rate, Open Interest, Liquidation Cluster, 주문 전략/체결/집중도/영향 분석을 수행하고, Gemini AI가 한국어로 해석해준다.

## 목차

- [사전 요구사항](#사전-요구사항)
- [로컬 실행](#로컬-실행)
- [API 엔드포인트](#api-엔드포인트)
- [배포](#배포)

## 사전 요구사항

- Node.js >= 20
- Docker & Docker Compose

## 로컬 실행

### 1. 인프라 실행 (Redis + MySQL)

```bash
docker compose up -d
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일에서 `GEMINI_API_KEY`를 설정한다. [Google AI Studio](https://aistudio.google.com)에서 발급 가능.

### 3. 의존성 설치 및 서버 실행

```bash
npm install
npm run dev
```

서버가 `http://localhost:4000`에서 실행된다.

### 4. 동작 확인

```bash
curl http://localhost:4000/api/v1/health
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/analysis/position` | 포지션 종합 분석 |
| POST | `/api/v1/analysis/order` | 오더 종합 분석 |
| POST | `/api/v1/analysis/funding` | 펀딩 레이트 분석 |
| POST | `/api/v1/analysis/oi` | Open Interest 분석 |
| POST | `/api/v1/analysis/liquidation` | Liquidation Cluster 분석 |
| GET | `/api/v1/health` | 서버 상태 확인 |

상세 API 규격은 [docs/api-spec.md](docs/api-spec.md) 참고.

## 배포

> TODO: dev/production 환경 배포 가이드 추가 예정
