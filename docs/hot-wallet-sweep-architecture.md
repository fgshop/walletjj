# Hot Wallet / Sweep Architecture
# 2026.02.19

## 개요

JOJU Wallet은 거래소 업계 표준 **Hot Wallet 패턴**을 사용합니다.
모든 입금은 개별 지갑에서 감지 후 Hot Wallet(MasterWallet)로 자동 sweep되며,
모든 잔액은 DB에서만 계산하고, 모든 출금은 Hot Wallet에서 직접 전송됩니다.

## 왜 필요한가

이전 방식의 치명적 문제:
- A(온체인 10 JOJU) → B에게 5 내부송금 → DB: A=5, B=15, 온체인: A=10, B=10
- B가 15 JOJU 출금 요청 → **불가** (B 온체인에는 10만 있음)
- 내부송금으로 받은 5 JOJU는 A의 온체인 지갑에 물리적으로 남아있어 영원히 출금 불가

**해결**: Hot Wallet 패턴 도입 후 모든 잔액이 출금 가능

## 자금 흐름

```
입금 → 유저지갑 감지 → DB DEPOSIT 기록 → auto-sweep (Hot Wallet로 이동)
내부송금 → DB만 업데이트 (즉시, 수수료 없음)
출금 → DB 잔액 체크 → 24h 대기 → 관리자 승인 → Hot Wallet에서 전송
```

## 잔액 계산 (DB 기반, 온체인 조회 없음)

```
DB잔액 = SUM(입금 received) + SUM(내부 received) - SUM(내부 sent) - SUM(출금 completed)
가용잔액 = DB잔액 - SUM(대기중 출금)
```

- `WalletService.getComputedBalance()` — DB 잔액
- `WalletService.getAvailableBalance()` — 가용 잔액 (출금 대기분 차감)
- SWEEP 트랜잭션은 잔액 계산에서 **제외** (시스템 내부 자금 이동)

## 핵심 컴포넌트

### 1. BlockMonitorService (`block-monitor.service.ts`)
- 10초마다 TRON 블록 폴링
- TRX 전송 및 TRC-20 transfer 이벤트 감지
- 유저 지갑으로의 입금 발견 시 → DEPOSIT 트랜잭션 생성 + sweep 큐잉

### 2. SweepService (`sweep.service.ts`)
- 입금 감지 후 BullMQ sweep 잡 등록
- 30초 딜레이 (블록 확인 대기)
- 3회 재시도, exponential backoff

### 3. SweepProcessor (`sweep.processor.ts`)
- TRX (JOJU): 유저 지갑 → Hot Wallet 직접 전송 (1 TRX reserve)
- TRC-20: Hot Wallet에서 유저에게 TRX gas 전송 → 유저 지갑에서 토큰 sweep
- SWEEP 타입 트랜잭션 기록 (잔액 계산에서 제외)

### 4. WithdrawalProcessor (`withdrawal.processor.ts`)
- APPROVED 상태의 출금을 **Hot Wallet에서 직접** 외부 주소로 전송
- Hot Wallet 잔액 사전 체크 (TRX + TRC-20)
- 실패 시 FAILED 상태 + 사유 기록 + 사용자 알림

### 5. WalletService (`wallet.service.ts`)
- `getComputedBalance()`: 유저의 DB 잔액 계산
- `getAvailableBalance()`: 가용 잔액 (pending 출금 차감)
- `getBalance()`: 프론트엔드용 전체 잔액 응답 (토큰별 잔액 + pending 정보)

## 트랜잭션 타입

| TxType | 설명 | 잔액 영향 |
|--------|------|-----------|
| `DEPOSIT` | 온체인 입금 감지 | +잔액 |
| `INTERNAL` | 회원간 내부 송금 | 발신자 -잔액, 수신자 +잔액 |
| `EXTERNAL_SEND` | 외부 출금 (Hot Wallet → 외부) | -잔액 |
| `SWEEP` | 유저지갑 → Hot Wallet 자동 이동 | 잔액 변동 없음 |

## 출금 프로세스

```
1. 유저가 출금 요청 → DB 가용잔액 체크 → WithdrawalRequest 생성 (PENDING_24H)
2. 24시간 후 → BullMQ 잡 → PENDING_APPROVAL 전환
3. 관리자 승인 → APPROVED → execute-withdrawal 잡 큐잉
4. WithdrawalProcessor:
   a. Hot Wallet 잔액 확인 (TRX 또는 TRC-20)
   b. PROCESSING 상태 전환
   c. Hot Wallet 키로 온체인 전송
   d. EXTERNAL_SEND 트랜잭션 기록 (fromAddress = Hot Wallet)
   e. COMPLETED 상태 + 사용자 알림
```

## 프론트엔드

- 단일 통합 잔액 표시 (온체인/내부 구분 없음)
- 모든 잔액이 송금 + 출금 가능
- SWEEP 트랜잭션은 사용자에게 표시하지 않음
- 출금 대기 금액 별도 표시

## 관련 파일

| 파일 | 역할 |
|------|------|
| `apps/api/prisma/schema.prisma` | TxType SWEEP enum |
| `apps/api/src/modules/wallet/wallet.service.ts` | DB 잔액 계산 |
| `apps/api/src/modules/withdrawal/withdrawal.processor.ts` | Hot Wallet 출금 실행 |
| `apps/api/src/modules/withdrawal/withdrawal.service.ts` | 출금 요청 + DB 잔액 체크 |
| `apps/api/src/modules/transaction/transaction.service.ts` | 내부 송금 + DB 잔액 체크 |
| `apps/api/src/modules/blockchain/block-monitor.service.ts` | 입금 감지 + sweep 트리거 |
| `apps/api/src/modules/blockchain/sweep.service.ts` | Sweep 큐잉 |
| `apps/api/src/modules/blockchain/sweep.processor.ts` | Sweep 실행 (BullMQ) |
| `apps/api/src/modules/queue/queue.constants.ts` | SWEEP_QUEUE 상수 |
