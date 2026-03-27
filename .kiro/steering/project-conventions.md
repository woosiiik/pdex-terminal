# 프로젝트 컨벤션

## 언어
- 코드 주석, 커밋 메시지, 문서는 한국어로 작성
- 변수명, 함수명, 타입명은 영어

## 프로젝트 구조
- `pdex-terminal-web/` : Next.js 15 프론트엔드 (포트 3000)
- `pdex-terminal-was/` : Express + TypeScript 백엔드 (포트 4000)
- 모노레포 구조, 각 프로젝트는 독립적인 package.json 보유

## 백엔드 (WAS)
- ESM 모듈 (`"type": "module"`)
- import 경로에 `.js` 확장자 필수 (예: `import { config } from "../config/index.js"`)
- Rule Engine과 AI Engine은 역할 분리: Rule Engine은 정량 분석, AI Engine은 LLM 해석
- LLM 폴백 순서: Claude Sonnet 4 → Groq → Gemini → OpenAI
- DB: MariaDB (MySQL 호환), Redis (캐시)
- 분석 결과는 `analysis_history` 테이블에 저장, 사용된 LLM 모델명도 `llm_model` 컬럼에 기록

## 프론트엔드 (Web)
- Next.js App Router, React 19, TailwindCSS 4
- 상태 관리: Zustand (단일 스토어 `useStore.ts`)
- 다크 테마 기반, 보라색(#A78BFA) 액센트
- `NEXT_PUBLIC_WAS_URL` 환경변수로 WAS 주소 설정 (빌드 타임에 결정)

## 배포
- `docker-compose.prod.yml`로 전체 서비스 (MariaDB, Redis, WAS, Web) 통합 배포
- 오라클 클라우드 무료 인스턴스 (ARM)
