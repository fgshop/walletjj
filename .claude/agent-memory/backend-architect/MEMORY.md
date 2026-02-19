# Backend Architect - JOJUWallet Memory

## Effective Balance Pattern
- Formula: `effectiveBalance = onChainBalance + internalNet - pendingWithdrawals`
- Internal transfers validate against effective balance (off-chain ledger)
- External withdrawals validate against on-chain balance only (minus pending withdrawals)
- Redis distributed lock (`transfer-lock:{userId}`, 10s TTL) prevents concurrent transfers
- `WalletService.getInternalNetBySymbol(userId)` calculates per-symbol net from Transaction table (INTERNAL + CONFIRMED)

## Module Dependencies
- TransactionModule imports WalletModule (for WalletService) and NotificationModule
- WalletModule exports WalletService, CryptoService, TronModule
- RedisModule is @Global() - available everywhere without explicit import
- TransactionService depends on: PrismaService, RedisService, TronService, WalletService, NotificationService

## Data Model Notes
- Transaction.amount is String type (not BigInt) - use Number() for comparisons
- WithdrawalRequest.amount is also String
- Pending withdrawal statuses: PENDING_24H, PENDING_APPROVAL, APPROVED, PROCESSING
- Internal transfers: TxType.INTERNAL with TxStatus.CONFIRMED (instant, no pending state)
- Token symbol "JOJU" maps to TRX (the native coin rebranded)
