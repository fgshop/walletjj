# JOJUWallet 잔액 체계: 온체인 vs 내부 (Off-chain)
# 2026.02.20

## 1. 개요

JOJUWallet은 TRON 블록체인 기반의 커스터디얼(custodial) 지갑 플랫폼으로, 사용자의 자산을 **두 가지 유형의 잔액**으로 관리한다.

| 구분 | 온체인 잔액 (On-chain Balance) | 내부 잔액 (Internal/Off-chain Balance) |
|------|-------------------------------|---------------------------------------|
| 저장 위치 | TRON 블록체인 | 플랫폼 DB (Transaction 테이블) |
| 검증 방법 | Tronscan에서 누구나 확인 가능 | 플랫폼 내부에서만 확인 가능 |
| 생성 방식 | 외부에서 TRON 주소로 입금 | 회원 간 내부 송금 |
| 성격 | 실제 블록체인 자산 | DB 원장 기록 |

이 두 잔액을 분리하는 근본적인 이유는 **블록체인에 기록된 실제 자산**과 **플랫폼 DB에만 존재하는 내부 이동 기록**의 본질적 차이 때문이다. 온체인 잔액은 블록체인 네트워크가 보증하는 실물 자산이지만, 내부 잔액은 플랫폼이 자체적으로 관리하는 장부상의 숫자에 불과하다.

---

## 2. 온체인 잔액 (On-chain Balance)

### 정의
사용자의 TRON 주소에 실제로 존재하는 TRX 및 TRC-20 토큰 잔액이다. 블록체인에 기록되어 있으므로 Tronscan(https://tronscan.org)에서 누구나 독립적으로 검증할 수 있다.

### 생성 과정
1. 사용자가 로그인하면 HD 지갑 파생을 통해 고유 TRON 주소가 자동 생성된다.
2. 외부 지갑 또는 거래소에서 해당 주소로 TRX 또는 TRC-20 토큰을 전송한다.
3. `BlockMonitorService`가 10초 주기의 cron 작업으로 새 블록을 폴링하여 입금을 감지한다.
4. 감지된 입금은 Transaction 테이블에 `type=EXTERNAL_RECEIVE`로 기록된다.

### 단위 변환
TRON 블록체인은 내부적으로 **SUN** 단위를 사용한다.

```
1 TRX = 1,000,000 SUN
```

`TronService.getBalance()`는 SUN 값을 반환하므로, 사용자에게 표시하거나 금액을 비교할 때 반드시 1,000,000으로 나누어 TRX 단위로 변환해야 한다. 실제 구현 코드:

```typescript
// WalletService.fetchBalancesFromNetwork()
const trxBalanceSun = await this.tronService.getBalance(address);
const trxBalance = (Number(trxBalanceSun) / 1_000_000).toString();
```

TRC-20 토큰의 경우 각 토큰의 `decimals` 값에 따라 변환한다:

```typescript
const normalized = token.decimals > 0
  ? (Number(rawBalance) / Math.pow(10, token.decimals)).toString()
  : rawBalance;
```

### 사용 가능 범위
- **외부 출금 (Withdrawal)**: 블록체인을 통해 외부 주소로 전송 가능
- **내부 송금 (Internal Transfer)**: 플랫폼 내 다른 회원에게 전송 가능

---

## 3. 내부 잔액 (Internal/Off-chain Balance)

### 정의
플랫폼 내 회원 간 송금을 통해 발생한 잔액으로, DB의 Transaction 테이블에 `type=INTERNAL`, `status=CONFIRMED`로 기록된다. 블록체인에는 어떠한 기록도 남지 않으며, Tronscan에서 확인할 수 없다.

### 생성 과정
1. 사용자 A가 사용자 B에게 내부 송금을 요청한다.
2. 수신자는 이메일 주소 또는 TRON 주소로 지정할 수 있다 (단, 플랫폼 내 등록된 주소여야 한다).
3. `TransactionService.internalTransfer()`가 잔액 검증 후 Transaction 레코드를 즉시 생성한다.
4. 블록체인 트랜잭션은 발생하지 않으며, DB 기록만으로 소유권이 이전된다.

### 잔액 계산 방식
내부 잔액은 **순잔액(net balance)**으로 계산된다:

```
내부 잔액 = 수신 합계 - 발신 합계
```

실제 구현 코드 (`WalletService.getInternalNetBySymbol()`):

```typescript
async getInternalNetBySymbol(userId: string): Promise<Record<string, number>> {
  const internalTxs = await this.prisma.transaction.findMany({
    where: {
      type: TxType.INTERNAL,
      status: TxStatus.CONFIRMED,
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    select: { fromUserId: true, toUserId: true, amount: true, tokenSymbol: true },
  });

  const net: Record<string, number> = {};
  for (const tx of internalTxs) {
    const sym = tx.tokenSymbol;
    const amt = Number(tx.amount);
    if (tx.toUserId === userId) {
      net[sym] = (net[sym] ?? 0) + amt;  // 수신: +
    }
    if (tx.fromUserId === userId) {
      net[sym] = (net[sym] ?? 0) - amt;  // 발신: -
    }
  }

  return net;
}
```

### 사용 제한
- **내부 송금만 가능**: 다른 회원에게 내부 송금 시 사용 가능
- **외부 출금 불가**: 내부 잔액은 블록체인에 존재하지 않으므로 외부 주소로 출금할 수 없다
- **Tronscan 미표시**: 블록체인 기록이 없으므로 Tronscan에서 확인 불가

---

## 4. 잔액 사용 규칙

### 행위별 사용 가능 잔액

| 행위 | 온체인 잔액 | 내부 잔액 |
|------|:-----------:|:---------:|
| 외부 출금 (Withdrawal) | O | **X** |
| 내부 송금 (Internal Transfer) | O | O |

### 출금 가능 금액 (Withdrawable Balance)

외부 출금 시 사용 가능한 금액은 온체인 잔액에서 출금 대기 금액을 차감한 값이다. 내부 잔액은 **절대로 포함되지 않는다**.

```
출금 가능 금액 = 온체인 잔액 - 출금 대기 금액
```

실제 구현 (`WithdrawalService.createWithdrawal()`):

```typescript
const onChain = dto.tokenAddress
  ? Number(currentBalance)
  : Number(currentBalance) / 1_000_000; // SUN → TRX
const availableForWithdrawal = onChain - pendingSum;

if (availableForWithdrawal < requestedAmount) {
  throw new BadRequestException(
    'Insufficient on-chain balance for withdrawal. ' +
    'Note: balances received via internal transfer cannot be withdrawn externally. ' +
    `Available on-chain: ${availableForWithdrawal} ${tokenSymbol}`,
  );
}
```

### 송금 가능 금액 (Sendable Balance)

내부 송금 시에는 온체인 잔액과 내부 잔액을 합산하여 사용할 수 있다. 단, 출금 대기 금액은 차감한다.

```
송금 가능 금액 = 온체인 잔액 + 내부 잔액 - 출금 대기 금액
```

실제 구현 (`TransactionService.internalTransfer()`):

```typescript
const onChain = dto.tokenAddress
  ? Number(onChainBalance)
  : Number(onChainBalance) / 1_000_000; // SUN → TRX
const effectiveBalance = onChain + netForSymbol - pendingSum;

if (effectiveBalance < amount) {
  throw new BadRequestException(
    `Insufficient balance. Available: ${effectiveBalance} ${tokenSymbol}`,
  );
}
```

### 출금 대기 금액 (Pending Withdrawals)

아직 완료되지 않은 출금 요청의 합계로, 다음 상태의 출금이 포함된다:
- `PENDING_24H`: 24시간 대기 중
- `PENDING_APPROVAL`: 관리자 승인 대기
- `APPROVED`: 승인 완료, 실행 대기
- `PROCESSING`: 블록체인 전송 처리 중

---

## 5. UI 표시 원칙

사용자 혼란을 방지하기 위해, 온체인 잔액과 내부 잔액은 반드시 **분리하여 표시**한다.

### Dashboard (BalanceCard)
- **온체인 잔액 카드**: 블록체인에 실제 존재하는 자산. "온체인"이라는 라벨과 함께 표시.
- **내부 잔액 카드**: 내부 송금으로 받은 순잔액. "내부"라는 라벨과 함께 표시.
- **절대로 두 잔액을 합산하여 단일 숫자로 표시하지 않는다.**

### Send (송금) 페이지
- "송금 가능" 금액을 표시하되, 구성 내역을 함께 보여준다:
  ```
  송금 가능: 150 JOJU
  (온체인 100 + 내부 70 - 출금대기 20)
  ```
- 사용자가 각 잔액의 출처를 명확히 인지할 수 있도록 한다.

### Withdraw (출금) 페이지
- "온체인 가용" 금액만 출금 가능 금액으로 표시한다:
  ```
  출금 가능: 80 JOJU (온체인 100 - 출금대기 20)
  ```
- 내부 잔액은 정보성으로만 표시하며, **"출금 불가"** 라벨을 반드시 함께 표시한다:
  ```
  내부 잔액: 70 JOJU (출금 불가)
  ```

### Transaction List (거래 내역)
- 각 거래 항목에 뱃지를 표시하여 출처를 구분한다:
  - `온체인` 뱃지: 외부 입금(EXTERNAL_RECEIVE), 외부 출금(EXTERNAL_SEND) 등 블록체인 트랜잭션
  - `내부` 뱃지: 내부 송금(INTERNAL) 트랜잭션
- 뱃지를 통해 사용자가 해당 거래가 블록체인 기반인지 내부 기록인지 즉시 파악할 수 있다.

---

## 6. 기술 구현

### API 엔드포인트

#### `GET /wallet/balance`

사용자의 전체 잔액 정보를 반환한다.

**응답 구조:**
```json
{
  "address": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "balances": [
    { "symbol": "JOJU", "balance": "100.5", "decimals": 6 },
    { "symbol": "USDT", "contractAddress": "TR7NHq...", "balance": "50.0", "decimals": 6 }
  ],
  "pendingBySymbol": {
    "JOJU": 20
  },
  "internalNetBySymbol": {
    "JOJU": 70,
    "USDT": 10
  },
  "fetchedAt": "2026-02-19T12:00:00.000Z",
  "fromCache": false
}
```

- `balances`: 온체인 잔액 (TronService를 통해 블록체인에서 직접 조회)
- `pendingBySymbol`: 토큰별 출금 대기 합계
- `internalNetBySymbol`: 토큰별 내부 순잔액 (수신 - 발신)

### 핵심 서비스 메서드

#### `WalletService.getBalance(userId, fresh?)`
1. 사용자 지갑 주소를 조회한다.
2. Redis 캐시를 확인한다 (TTL: 30초). `fresh=true`면 캐시를 무시한다.
3. `fetchBalancesFromNetwork()`로 온체인 잔액을 조회한다.
   - `TronService.getBalance(address)` → SUN 값 반환 → `/ 1_000_000`으로 TRX 변환
   - 활성화된 `SupportedToken` 목록을 순회하며 `TronService.getTrc20Balance()`로 각 토큰 잔액 조회
4. `WithdrawalRequest` 테이블에서 진행 중인 출금의 토큰별 합계를 계산한다.
5. `getInternalNetBySymbol()`로 내부 순잔액을 계산한다.
6. 세 가지 정보를 합쳐서 반환한다.

#### `WalletService.getInternalNetBySymbol(userId)`
1. Transaction 테이블에서 `type=INTERNAL`, `status=CONFIRMED`인 레코드를 조회한다.
2. 사용자가 수신자(`toUserId`)인 경우 해당 금액을 더하고, 발신자(`fromUserId`)인 경우 뺀다.
3. 토큰 심볼별로 순잔액을 `Record<string, number>` 형태로 반환한다.

#### `TransactionService.internalTransfer(dto)`
1. 발신자 지갑 확인 및 잠금 상태 검증
2. 수신자 확인 (이메일 또는 TRON 주소로 검색, 플랫폼 내 등록 필수)
3. 자기 자신에게 송금 방지
4. 분산 락(Redis) 획득 (동시 전송 방지, TTL: 10초)
5. 송금 가능 금액 검증:
   ```
   effectiveBalance = onChain / 1_000_000 + internalNet - pendingSum
   ```
6. Transaction 레코드 생성 (`type=INTERNAL`, `status=CONFIRMED`, 즉시 확정)
7. 발신자/수신자 양측에 알림 전송

#### `WithdrawalService.createWithdrawal(dto)`
1. TRON 주소 형식 검증
2. 지갑 확인 및 잠금 상태 검증
3. 자기 주소로의 출금 방지
4. 출금 가능 금액 검증 (**내부 잔액 미포함**):
   ```
   availableForWithdrawal = onChain / 1_000_000 - pendingSum
   ```
5. `WithdrawalRequest` 생성 (`status=PENDING_24H`, 24시간 후 `availableAt`)
6. BullMQ delayed job 등록 (24시간 후 `PENDING_APPROVAL`로 전환)
7. 사용자에게 알림 전송

### 단위 변환 주의사항

| 항목 | 반환 단위 | 변환 필요 |
|------|-----------|-----------|
| `TronService.getBalance()` | SUN | `/ 1_000_000` → TRX |
| `TronService.getTrc20Balance()` | Raw token units | `/ 10^decimals` |
| `dto.amount` (사용자 입력) | TRX / 토큰 단위 | 변환 불필요 |
| `Transaction.amount` | TRX / 토큰 단위 | 변환 불필요 |
| `WithdrawalRequest.amount` | TRX / 토큰 단위 | 변환 불필요 |

단위 변환을 누락하면 잔액 비교가 1,000,000배 차이나므로, 온체인 잔액 조회 후 반드시 변환을 수행해야 한다.

---

## 7. 왜 합산하면 안 되는가?

온체인 잔액과 내부 잔액을 단일 숫자로 합산하여 표시하는 것은 다음과 같은 심각한 문제를 야기한다.

### 1) Tronscan과의 불일치
사용자가 Tronscan에서 자신의 주소를 검색하면 온체인 잔액만 표시된다. 앱에서 합산된 숫자를 보여주면 Tronscan과 다른 금액이 보이게 되어 사용자가 "잔액이 사라졌다" 또는 "시스템 오류"로 오해할 수 있다.

**예시:**
- 온체인 잔액: 100 JOJU
- 내부 잔액: 70 JOJU
- 앱 표시 (합산): 170 JOJU
- Tronscan 표시: 100 JOJU
- 사용자 반응: "70 JOJU가 어디로 갔는가?"

### 2) 출금 불가 자산에 대한 혼란
합산된 잔액을 보고 사용자가 전액 출금을 시도하면 실패한다. 내부 잔액은 블록체인에 존재하지 않으므로 외부 전송이 물리적으로 불가능하기 때문이다.

**예시:**
- 합산 표시: 170 JOJU
- 출금 시도: 170 JOJU
- 결과: "Insufficient on-chain balance" 오류
- 사용자 반응: "170이 있는데 왜 출금이 안 되는가?"

### 3) 분쟁 위험
합산 표시는 사용자에게 "나에게 170 JOJU가 있다"는 기대를 형성한다. 실제로 출금할 수 있는 자산이 100 JOJU뿐이라면 이는 플랫폼에 대한 신뢰 문제로 이어지고, 법적 분쟁의 원인이 될 수 있다.

### 4) 자산 성격의 본질적 차이
- **온체인 잔액**: TRON 네트워크가 보증하는 실제 자산. 블록체인이 존재하는 한 증명 가능.
- **내부 잔액**: 플랫폼 DB에만 기록된 장부 숫자. 플랫폼이 폐쇄되면 소멸.

이 두 가지를 같은 숫자로 취급하는 것은 "은행 잔액"과 "친구에게 빌려준 돈을 합산하여 총 자산으로 표시"하는 것과 유사하다. 성격이 다른 자산은 분리하여 관리하고 표시해야 한다.

---

## 8. 향후 고려사항

### 온체인 정산 (On-chain Settlement)

현재 내부 잔액은 DB 기록으로만 존재하지만, 향후 이를 실제 블록체인 트랜잭션으로 정산하는 기능을 고려할 수 있다.

- **주기적 정산**: 일정 기간 또는 일정 금액 이상 누적 시 자동으로 온체인 트랜잭션 실행
- **요청형 정산**: 사용자가 "정산" 버튼을 눌러 내부 잔액을 온체인으로 변환
- 정산 시 블록체인 수수료(에너지/대역폭)가 발생하므로, 수수료 정책 수립이 필요하다

### 사용자 정산 기능

사용자에게 "정산" 기능을 제공하여 내부 잔액을 온체인 잔액으로 전환할 수 있도록 한다.

```
사용자 요청: 내부 잔액 70 JOJU를 정산
→ 시스템 Hot Wallet에서 사용자 주소로 70 JOJU 온체인 전송
→ 내부 잔액 70 → 0, 온체인 잔액 100 → 170
```

이 경우 플랫폼이 Hot Wallet에 충분한 유동성을 확보하고 있어야 한다.

### Hot Wallet 풀링

내부 송금의 효율적 정산을 위해 시스템 Hot Wallet을 운영한다.

- 모든 사용자의 실제 자산을 Hot Wallet로 집중 관리
- 내부 송금은 DB 기록으로 처리하고, 정산 시 Hot Wallet에서 일괄 처리
- Hot Wallet의 잔액 모니터링 및 자동 충전 체계 구축 필요
- 보안 관점에서 Cold Wallet과의 자금 분리 정책도 수립해야 한다

### 추가 검토 사항

- **감사 추적**: 내부 잔액 변동 내역의 별도 감사 로그 관리
- **한도 설정**: 내부 잔액이 과도하게 누적되지 않도록 정산 유도 한도 설정
- **수수료 정책**: 내부 송금 수수료 vs 온체인 정산 수수료의 차등 적용
- **규정 준수**: 내부 잔액의 법적 지위 및 자금 이동 보고 의무 검토
