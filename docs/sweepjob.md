# Hot Wallet / Sweep Architecture
# 2026.02.18
## 배경: 왜 이 변경이 필요했는가

### 기존 아키텍처의 문제

- A(온체인 10 JOJU) → B에게 5 내부송금 → DB: A=5, B=15 / 온체인: A=10, B=10
- B가 15 JOJU 출금 요청 → **불가** (B 온체인에는 10만 있음)
- 내부송금으로 받은 5 JOJU는 A의 온체인 지갑에 물리적으로 남아있어 영원히 출금 불가

### 해결: 거래소 업계 표준 Hot Wallet 패턴

- 모든 입금은 개별 지갑에서 감지 후 Hot Wallet(MasterWallet)로 **자동 sweep**
- 모든 잔액은 **DB에서만 계산** (온체인 조회 제거)
- 모든 출금은 **Hot Wallet에서 전송** (개별 지갑 키 사용 안 함)
- 내부 송금은 기존과 동일 (DB only)

**결과**: A=5, B=15 상태에서 B가 15 출금 → Hot Wallet에서 15 전송 → 정상 완료

---

## 구현 내용

### 1. Schema + Enum 변경

**`apps/api/prisma/schema.prisma`** / **`packages/types/src/enums.ts`**

```
TxType에 SWEEP 추가 — 개별지갑 → Hot Wallet 자금 이동 기록용
```

**`apps/api/src/modules/queue/queue.constants.ts`** / **`queue.module.ts`**

```
SWEEP_QUEUE 추가 및 BullMQ 큐 등록
```

### 2. WalletService — DB 기반 잔액 계산 (핵심)

**`apps/api/src/modules/wallet/wallet.service.ts`**

- `fetchBalancesFromNetwork()` 제거 (온체인 조회 없음)
- `getInternalNetBySymbol()` 제거 (통합 잔액에 포함)

새 메서드:

| 메서드 | 설명 |
|--------|------|
| `getComputedBalance(userId, tokenSymbol)` | DB 잔액 계산 |
| `getAvailableBalance(userId, tokenSymbol)` | DB 잔액 - pending 출금 |

잔액 공식:

```
DB잔액 = SUM(DEPOSIT received) + SUM(INTERNAL received)
       - SUM(INTERNAL sent) - SUM(EXTERNAL_SEND completed)

가용잔액 = DB잔액 - SUM(대기중 출금)
```

SWEEP 타입 트랜잭션은 잔액 계산에서 **제외** (유저 잔액에 영향 없음).

### 3. WithdrawalService — DB 잔액 체크

**`apps/api/src/modules/withdrawal/withdrawal.service.ts`**

- `tronService.getBalance()` → `walletService.getAvailableBalance()` 로 교체
- "내부 잔액은 출금 불가" 에러 메시지 삭제 (이제 모든 잔액 출금 가능)

### 4. TransactionService — DB 잔액 체크

**`apps/api/src/modules/transaction/transaction.service.ts`**

- 온체인 잔액 + internalNet 계산 → `walletService.getAvailableBalance()` 단일 호출로 교체
- SWEEP 타입 거래는 유저 거래내역에서 숨김 (`type: { not: TxType.SWEEP }`)

### 5. WithdrawalProcessor — Hot Wallet에서 출금

**`apps/api/src/modules/withdrawal/withdrawal.processor.ts`**

변경 전:
```
유저 지갑 키로 직접 전송
```

변경 후:
```
MasterWallet(Hot Wallet)에서 전송
- Hot Wallet 잔액 사전 체크
- masterWallet.encryptedKey 사용
- fromAddress를 masterWallet.address로 기록
```

### 6. Auto-Sweep 서비스

**`apps/api/src/modules/blockchain/sweep.service.ts`** (신규)

- `queueSweep()` — BullMQ sweep 잡 등록 (30초 지연, 3회 재시도, exponential backoff)

**`apps/api/src/modules/blockchain/sweep.processor.ts`** (신규)

- `sweep-deposit` 잡 처리
- **TRX(JOJU)**: 유저 지갑 → Hot Wallet 직접 전송 (1 TRX reserve 유지)
- **TRC-20**: Hot Wallet에서 유저에게 15 TRX gas 전송 → 유저 지갑에서 토큰 sweep
- Transaction 기록 (type: SWEEP)

**`apps/api/src/modules/blockchain/block-monitor.service.ts`** 수정:

- 입금 감지(`createDepositTransaction()`) 후 `sweepService.queueSweep()` 자동 호출

### 7. Frontend 단순화

| 파일 | 변경 |
|------|------|
| `BalanceCard.tsx` | 온체인/내부 2컬럼 → 단일 잔액 카드 |
| `send/page.tsx` | `onchainBalance` + `internalNet` → 단일 `balance` |
| `withdraw/page.tsx` | "내부 잔액 출금 불가" 배너 삭제, 단일 가용잔액 표시 |
| `receive/page.tsx` | "입금하면 잔액에 자동 반영" 단순 안내 |
| `TransactionList.tsx` | SWEEP 타입 배지 추가 (백엔드에서 필터링됨) |

### 8. 기존 데이터 마이그레이션 + Admin Sweep

**`apps/api/src/modules/admin/admin-wallets/admin-wallets.controller.ts`**

| Endpoint | 권한 | 설명 |
|----------|------|------|
| `POST /admin/wallets/migrate-balances` | SUPER_ADMIN | 전체 지갑 일괄 마이그레이션 |
| `POST /admin/wallets/:id/sweep` | ADMIN | 개별 지갑 sweep |

**`apps/api/src/modules/admin/admin-wallets/admin-wallets.service.ts`**

마이그레이션 동작:

1. 모든 유저 지갑의 온체인 TRX + TRC-20 잔액 조회
2. 잔액 > 0이면 DEPOSIT 트랜잭션 생성 (`memo: 'migration-initial'`)
3. BullMQ sweep 잡 큐잉 → Hot Wallet로 자금 이동
4. 멱등성 보장 (`migration-initial` memo 존재 시 스킵)

**`apps/admin/src/app/(dashboard)/wallets/page.tsx`**

- 상단 **"전체 마이그레이션"** 버튼 (confirm 대화상자)
- 각 지갑 행에 **"Sweep"** 버튼
- 결과 요약 표시 (처리 N건, 스킵 N건)

**`apps/admin/src/app/(dashboard)/users/page.tsx`**

- 유저별 **온체인 잔액 / 오프체인 잔액** 표시
- Tronscan 링크 (메인넷)

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `apps/api/prisma/schema.prisma` | TxType에 SWEEP 추가 |
| `packages/types/src/enums.ts` | TxType에 SWEEP 추가 |
| `apps/api/src/modules/queue/queue.constants.ts` | SWEEP_QUEUE 상수 |
| `apps/api/src/modules/queue/queue.module.ts` | 큐 등록 |
| `apps/api/src/modules/wallet/wallet.service.ts` | DB 잔액 계산 전면 변경 |
| `apps/api/src/modules/wallet/wallet.controller.ts` | fresh 파라미터 제거 |
| `apps/api/src/modules/withdrawal/withdrawal.service.ts` | DB 잔액 체크 |
| `apps/api/src/modules/withdrawal/withdrawal.processor.ts` | Hot Wallet 출금 |
| `apps/api/src/modules/transaction/transaction.service.ts` | DB 잔액 체크 |
| `apps/api/src/modules/blockchain/block-monitor.service.ts` | sweep 트리거 추가 |
| `apps/api/src/modules/blockchain/blockchain.module.ts` | 모듈 갱신 |
| `apps/api/src/modules/blockchain/sweep.service.ts` | **신규** — Sweep 큐 서비스 |
| `apps/api/src/modules/blockchain/sweep.processor.ts` | **신규** — Sweep BullMQ 워커 |
| `apps/api/src/modules/admin/admin-wallets/admin-wallets.controller.ts` | migrate/sweep 엔드포인트 |
| `apps/api/src/modules/admin/admin-wallets/admin-wallets.service.ts` | 마이그레이션 로직 |
| `apps/api/src/modules/admin/admin-users/admin-users.service.ts` | wallet.id 포함 |
| `apps/api/src/modules/admin/admin.module.ts` | WalletModule import |
| `apps/web/src/components/BalanceCard.tsx` | 통합 잔액 UI |
| `apps/web/src/app/(main)/send/page.tsx` | 단순화 |
| `apps/web/src/app/(main)/withdraw/page.tsx` | 단순화 |
| `apps/web/src/app/(main)/receive/page.tsx` | 안내문 갱신 |
| `apps/web/src/app/(main)/dashboard/page.tsx` | 통합 잔액 표시 |
| `apps/web/src/app/(main)/transactions/page.tsx` | SWEEP 필터 |
| `apps/web/src/components/TransactionList.tsx` | SWEEP 배지 |
| `apps/admin/src/app/(dashboard)/users/page.tsx` | 온체인/오프체인 잔액 + Tronscan |
| `apps/admin/src/app/(dashboard)/wallets/page.tsx` | Sweep/마이그레이션 버튼 |

---

## 검증 방법

1. **DB 잔액 계산**: 내부 송금 후 잔액이 정확히 반영되는지 확인
2. **출금 검증**: 내부 잔액을 포함한 전체 잔액으로 출금 가능한지 확인
3. **Sweep 검증**: 입금 감지 후 유저 지갑 → Hot Wallet 자금 이동 확인
4. **Hot Wallet 잔액 부족**: 출금 시 적절한 에러 반환 확인
5. **마이그레이션**: 기존 온체인 잔액이 DB에 반영되고 sweep 되는지 확인
6. **멱등성**: 마이그레이션 재실행 시 중복 처리 없이 스킵되는지 확인
7. **빌드**: `pnpm build` 전체 통과
