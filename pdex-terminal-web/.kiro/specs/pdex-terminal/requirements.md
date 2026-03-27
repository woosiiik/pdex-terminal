# 요구사항 문서

## 소개

PDEX Terminal은 Hyperliquid, Aster 등 탈중앙화 무기한 선물 거래소(P-DEX) 사용자를 위한 실시간 모니터링 및 AI 분석 터미널이다. 사용자의 포트폴리오, 마켓 데이터를 실시간으로 제공하고, AI 기반 포지션 분석과 트레이딩 인사이트를 통해 투자 의사결정을 지원한다.

## 마일스톤

### 마일스톤 1: MVP (Hyperliquid 전용)
- 지갑 주소 입력을 통한 포트폴리오 조회
- 오픈 포지션, 오픈 오더 화면 노출
- 코인 선택 시 차트와 오더북 노출
- AI 기반 포지션/오더 자동 분석

### 마일스톤 2: 멀티 P-DEX 지원
- Aster 등 추가 P-DEX 연동
- 지갑 연동 (WalletConnect 등)
- SNS 알림 연동 (텔레그램, 카카오톡)

### 마일스톤 3: Trade Journal
- 일일 거래 결과 및 평가 자동 생성
- AI 트레이딩 아이디어 제공

### 마일스톤 4: 수익화
- 거래소 레퍼럴 등록 기반 서비스 제공
- 월정액 코인 결제

### 마일스톤 5: 모바일 서비스
- 모바일 최적화 서비스 제공

## 용어 사전

- **PDEX_Terminal**: Hyperliquid 등 P-DEX 사용자의 포트폴리오, 마켓 데이터, AI 분석을 제공하는 웹 기반 터미널 애플리케이션
- **Web_Service**: Next.js 기반 프론트엔드 서비스로, Hyperliquid WebSocket 구독 및 UI 렌더링을 담당하는 컴포넌트
- **Analysis_Server**: Node.js 기반 백엔드 서비스로, AI 분석 요청을 처리하고 결과를 반환하는 컴포넌트
- **Portfolio_View**: 사용자의 총 자산, 미실현 PnL, 마진 사용률 등을 표시하는 좌측 패널 영역
- **Market_View**: 선택한 코인의 차트, 오더북, 펀딩 레이트를 표시하는 중앙 패널 영역
- **AI_Copilot**: 포지션 리스크 분석, 펀딩 분석, OI 분석 결과 및 제안을 표시하는 우측 패널 영역
- **Risk_Score**: 레버리지, 펀딩 레이트, 저항선 근접도, 청산 거리, 변동성 대비 레버리지를 종합한 1~10 척도의 위험도 점수
- **Funding_Rate**: 무기한 선물 계약에서 롱/숏 포지션 간 주기적으로 교환되는 수수료율
- **Open_Interest**: 특정 자산의 미결제 선물 계약 총량
- **Liquidation_Distance**: 현재 가격에서 청산 가격까지의 거리를 백분율로 표현한 값
- **Wallet_Address**: Hyperliquid 네트워크에서 사용자를 식별하는 고유 주소 문자열

## 요구사항

### 요구사항 1: 지갑 주소 입력 및 검증

**사용자 스토리:** 사용자로서, 지갑 주소를 입력하여 내 P-DEX 계정 데이터에 접근하고 싶다.

#### 인수 조건

1. THE Web_Service SHALL 상단 바에 지갑 주소 입력 필드를 제공한다
2. WHEN 사용자가 지갑 주소를 입력하면, THE Web_Service SHALL 해당 주소가 유효한 Ethereum 형식(0x로 시작하는 42자 16진수 문자열)인지 검증한다
3. IF 유효하지 않은 지갑 주소가 입력되면, THEN THE Web_Service SHALL "유효하지 않은 지갑 주소입니다" 오류 메시지를 표시한다
4. WHEN 유효한 지갑 주소가 입력되면, THE Web_Service SHALL 해당 주소의 Hyperliquid 계정 데이터 로딩을 시작한다
5. WHEN 지갑 주소가 성공적으로 연결되면, THE Web_Service SHALL 상단 바에 축약된 주소(앞 6자 + ... + 뒤 4자)와 총 PnL, Risk_Score를 표시한다

### 요구사항 2: 포트폴리오 조회

**사용자 스토리:** 사용자로서, 내 Hyperliquid 계정의 전체 포트폴리오를 실시간으로 확인하고 싶다.

#### 인수 조건

1. WHEN 지갑 주소가 연결되면, THE Web_Service SHALL Hyperliquid REST API(/info 엔드포인트)를 통해 포트폴리오 데이터를 조회한다
2. THE Portfolio_View SHALL 총 계정 가치, 미실현 PnL, 실현 PnL, 사용 가능 마진, 총 마진 사용률을 표시한다
3. THE Web_Service SHALL 주기적으로(10초 간격) REST API를 폴링하여 포트폴리오 데이터를 갱신한다
4. WHEN 포트폴리오 데이터가 갱신되면, THE Portfolio_View SHALL 1초 이내에 화면을 갱신한다
5. IF REST API 호출이 실패하면, THEN THE Web_Service SHALL 자동으로 재시도하고 "데이터 갱신 재시도 중" 상태를 표시한다
6. IF 3회 연속 API 호출에 실패하면, THEN THE Web_Service SHALL "연결 실패. 새로고침 해주세요" 오류 메시지를 표시한다

### 요구사항 3: 오픈 포지션 표시

**사용자 스토리:** 사용자로서, 현재 보유 중인 모든 오픈 포지션을 실시간으로 확인하고 싶다.

#### 인수 조건

1. WHEN 지갑 주소가 연결되면, THE Web_Service SHALL Hyperliquid WebSocket을 통해 오픈 포지션 데이터를 구독한다
2. THE Portfolio_View SHALL 각 오픈 포지션에 대해 코인명, 방향(롱/숏), 진입가, 현재가, 포지션 크기, 레버리지, 미실현 PnL, 청산가를 표시한다
3. WHEN 포지션 데이터가 업데이트되면, THE Portfolio_View SHALL 미실현 PnL과 현재가를 실시간으로 갱신한다
4. THE Portfolio_View SHALL 미실현 PnL이 양수인 경우 녹색, 음수인 경우 적색으로 표시한다
5. WHEN 사용자가 포지션 목록에서 특정 코인을 선택하면, THE Market_View SHALL 해당 코인의 차트와 오더북을 표시한다

### 요구사항 4: 오픈 오더 표시

**사용자 스토리:** 사용자로서, 현재 대기 중인 모든 오픈 오더를 확인하고 싶다.

#### 인수 조건

1. WHEN 지갑 주소가 연결되면, THE Web_Service SHALL Hyperliquid WebSocket을 통해 오픈 오더 데이터를 구독한다
2. THE Portfolio_View SHALL 각 오픈 오더에 대해 코인명, 주문 유형(지정가/시장가), 방향(매수/매도), 주문 가격, 주문 수량, 주문 시간을 표시한다
3. WHEN 오더 상태가 변경(체결/취소)되면, THE Portfolio_View SHALL 해당 오더를 목록에서 즉시 갱신한다

### 요구사항 5: 마켓 차트 표시

**사용자 스토리:** 사용자로서, 선택한 코인의 가격 차트를 실시간으로 확인하고 싶다.

#### 인수 조건

1. WHEN 사용자가 코인을 선택하면, THE Market_View SHALL 해당 코인의 캔들스틱 차트를 표시한다
2. THE Market_View SHALL 1분, 5분, 15분, 1시간, 4시간, 1일 타임프레임 선택 옵션을 제공한다
3. WHEN 새로운 캔들 데이터가 수신되면, THE Market_View SHALL 차트를 실시간으로 갱신한다
4. THE Market_View SHALL 차트에 거래량 바를 하단에 함께 표시한다

### 요구사항 6: 오더북 표시

**사용자 스토리:** 사용자로서, 선택한 코인의 오더북을 실시간으로 확인하고 싶다.

#### 인수 조건

1. WHEN 사용자가 코인을 선택하면, THE Market_View SHALL 해당 코인의 오더북을 표시한다
2. THE Market_View SHALL 매수 호가(녹색)와 매도 호가(적색)를 가격, 수량, 누적 수량과 함께 표시한다
3. WHEN 오더북 데이터가 업데이트되면, THE Market_View SHALL 오더북을 실시간으로 갱신한다
4. THE Market_View SHALL 현재 스프레드(최우선 매도가 - 최우선 매수가)를 오더북 중앙에 표시한다

### 요구사항 7: 펀딩 레이트 표시

**사용자 스토리:** 사용자로서, 선택한 코인의 펀딩 레이트 정보를 확인하고 싶다.

#### 인수 조건

1. WHEN 사용자가 코인을 선택하면, THE Market_View SHALL 해당 코인의 현재 Funding_Rate를 표시한다
2. THE Market_View SHALL 최근 24시간 펀딩 레이트 히스토리를 차트로 표시한다
3. THE Market_View SHALL Funding_Rate가 양수인 경우 녹색, 음수인 경우 적색으로 표시한다

### 요구사항 8: AI 포지션 리스크 분석

**사용자 스토리:** 사용자로서, 내 오픈 포지션의 리스크를 AI가 자동으로 분석해주길 원한다.

> 상세 분석 모델, Risk Score 계산 방식, Support/Resistance 처리, Liquidation Cluster 분석은 [AI Copilot 분석 요구사항 상세](../../docs/ai-copilot-position-analysis.md)를 참조한다.

#### 인수 조건

1. WHEN 오픈 포지션 데이터가 로드되면, THE Web_Service SHALL Analysis_Server에 포지션 리스크 분석을 요청한다
2. THE Analysis_Server SHALL 5가지 리스크 요소(레버리지, 청산 거리, 변동성, 펀딩 방향, 포지션 집중도)를 종합하여 1~10 척도의 Risk_Score를 산출한다
3. THE AI_Copilot SHALL 각 포지션의 Risk_Score와 근거를 한국어로 표시한다

### 요구사항 9: AI 펀딩 레이트 분석

**사용자 스토리:** 사용자로서, 펀딩 레이트 추세를 AI가 분석하여 트레이딩 시그널을 제공해주길 원한다.

> 상세 분석 지표(1h/4h/24h Trend, Z-Score), Mean Reversion, Extreme Signal 기준은 [AI Copilot 분석 요구사항 상세](../../docs/ai-copilot-position-analysis.md)를 참조한다.

#### 인수 조건

1. WHEN 사용자가 코인을 선택하면, THE Web_Service SHALL Analysis_Server에 펀딩 분석을 요청한다
2. THE Analysis_Server SHALL 펀딩 추세, 평균 회귀 가능성, 극단 시그널을 분석한다
3. THE AI_Copilot SHALL 현재 Funding_Rate 값과 AI 해석을 한국어로 표시한다

### 요구사항 10: AI Open Interest 분석

**사용자 스토리:** 사용자로서, Open Interest 변화와 가격 움직임의 관계를 AI가 분석해주길 원한다.

> 상세 OI Spike 감지 조건, 가격-OI 조합 시나리오는 [AI Copilot 분석 요구사항 상세](../../docs/ai-copilot-position-analysis.md)를 참조한다.

#### 인수 조건

1. WHEN 사용자가 코인을 선택하면, THE Web_Service SHALL Analysis_Server에 OI 분석을 요청한다
2. THE Analysis_Server SHALL 가격-OI 변화 조합으로 4가지 시나리오를 판별한다
3. THE AI_Copilot SHALL 현재 OI 변화율과 AI 해석을 한국어로 표시한다

### 요구사항 11: AI Open Order 분석

**사용자 스토리:** 사용자로서, 내 미체결 주문의 전략과 체결 가능성을 AI가 분석해주길 원한다.

> 상세 전략 탐지, 체결 가능성 기준, 주문 집중도 분석, 포지션 영향 분석, 전략 변경 탐지는 [AI Copilot Open Order 분석 요구사항 상세](../../docs/ai-copilot-order-analysis.md)를 참조한다.

#### 인수 조건

1. WHEN Open Order 데이터가 로드되면, THE Web_Service SHALL Analysis_Server에 주문 전략 분석을 요청한다
2. THE Analysis_Server SHALL 주문 가격 분포와 방향성을 분석하여 전략 패턴(Grid/Range/Breakout/Accumulation)을 탐지한다
3. THE AI_Copilot SHALL 탐지된 전략, 체결 가능성, 포지션 영향을 한국어로 표시한다

### 요구사항 12: 레이아웃 구성

**사용자 스토리:** 사용자로서, 터미널의 각 영역을 직관적으로 사용하고 싶다.

#### 인수 조건

1. THE Web_Service SHALL 상단 바(Top Bar), 좌측 패널(Portfolio_View), 중앙 패널(Market_View), 우측 패널(AI_Copilot), 하단 영역(Alerts/Trade Journal)으로 구성된 레이아웃을 제공한다
2. THE Web_Service SHALL 상단 바에 연결된 지갑 주소, 총 PnL, 전체 Risk_Score를 표시한다
3. THE Portfolio_View SHALL 포지션 목록, 오더 목록 간 탭 전환 기능을 제공한다
4. THE Market_View SHALL 차트, 오더북, 펀딩 정보 간 탭 전환 기능을 제공한다
5. THE AI_Copilot SHALL 리스크 분석, 펀딩 분석, OI 분석, AI 제안 간 탭 전환 기능을 제공한다

### 요구사항 13: Hyperliquid WebSocket 데이터 파싱

**사용자 스토리:** 개발자로서, Hyperliquid WebSocket 메시지를 안정적으로 파싱하여 애플리케이션 데이터 모델로 변환하고 싶다.

#### 인수 조건

1. WHEN Hyperliquid WebSocket으로부터 JSON 메시지를 수신하면, THE Web_Service SHALL 해당 메시지를 애플리케이션 내부 데이터 모델로 파싱한다
2. IF 수신된 메시지가 유효하지 않은 JSON 형식이면, THEN THE Web_Service SHALL 파싱 오류를 로그에 기록하고 해당 메시지를 무시한다
3. THE Web_Service SHALL 파싱된 데이터 모델을 다시 JSON 문자열로 직렬화하는 포매터를 제공한다
4. FOR ALL 유효한 WebSocket 메시지에 대해, 파싱 후 직렬화한 결과를 다시 파싱하면 원본과 동일한 데이터 모델이 생성된다 (라운드트립 속성)

### 요구사항 14: AI 분석 요청/응답 처리

**사용자 스토리:** 개발자로서, Web_Service와 Analysis_Server 간 AI 분석 요청/응답을 안정적으로 처리하고 싶다.

#### 인수 조건

1. WHEN Web_Service가 AI 분석을 요청하면, THE Analysis_Server SHALL JSON 형식의 분석 결과를 반환한다
2. THE Analysis_Server SHALL 분석 요청을 수신한 후 10초 이내에 응답한다
3. IF Analysis_Server가 분석 처리 중 오류가 발생하면, THEN THE Analysis_Server SHALL HTTP 상태 코드와 오류 메시지를 포함한 JSON 응답을 반환한다
4. THE Web_Service SHALL Analysis_Server의 응답 JSON을 내부 분석 결과 모델로 파싱한다
5. THE Web_Service SHALL 내부 분석 결과 모델을 JSON 문자열로 직렬화하는 포매터를 제공한다
6. FOR ALL 유효한 분석 응답에 대해, 파싱 후 직렬화한 결과를 다시 파싱하면 원본과 동일한 분석 결과 모델이 생성된다 (라운드트립 속성)
