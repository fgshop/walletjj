'use client';

import { TxStatus, TxType, WithdrawalStatus } from '@joju/types';

interface TransactionItem {
  id: string;
  type: TxType;
  status: TxStatus;
  amount: string;
  tokenSymbol: string;
  tokenDecimals?: number;
  fromAddress: string;
  toAddress: string;
  txHash?: string | null;
  memo?: string | null;
  createdAt: string;
  withdrawalStatus?: WithdrawalStatus;
  _isWithdrawalRequest?: boolean;
}

interface TransactionListProps {
  transactions: TransactionItem[];
  loading?: boolean;
}

const typeLabels: Record<TxType, string> = {
  [TxType.INTERNAL]: '내부 송금',
  [TxType.EXTERNAL_SEND]: '외부 출금',
  [TxType.EXTERNAL_RECEIVE]: '외부 입금',
  [TxType.DEPOSIT]: '입금',
};

const statusConfig: Record<TxStatus, { label: string; className: string }> = {
  [TxStatus.PENDING]: { label: '대기중', className: 'bg-yellow-100 text-yellow-700' },
  [TxStatus.CONFIRMED]: { label: '완료', className: 'bg-green-100 text-green-700' },
  [TxStatus.FAILED]: { label: '실패', className: 'bg-red-100 text-red-700' },
};

const withdrawalStatusConfig: Record<WithdrawalStatus, { label: string; className: string }> = {
  [WithdrawalStatus.PENDING_24H]: { label: '24시간 대기', className: 'bg-orange-100 text-orange-700' },
  [WithdrawalStatus.PENDING_APPROVAL]: { label: '승인 대기', className: 'bg-yellow-100 text-yellow-700' },
  [WithdrawalStatus.APPROVED]: { label: '승인됨', className: 'bg-blue-100 text-blue-700' },
  [WithdrawalStatus.REJECTED]: { label: '거절됨', className: 'bg-red-100 text-red-700' },
  [WithdrawalStatus.PROCESSING]: { label: '처리중', className: 'bg-blue-100 text-blue-700' },
  [WithdrawalStatus.COMPLETED]: { label: '완료', className: 'bg-green-100 text-green-700' },
  [WithdrawalStatus.FAILED]: { label: '실패', className: 'bg-red-100 text-red-700' },
  [WithdrawalStatus.REFUNDED]: { label: '환불됨', className: 'bg-gray-100 text-gray-700' },
};

function typeIcon(type: TxType) {
  const isOutgoing = type === TxType.INTERNAL || type === TxType.EXTERNAL_SEND;
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isOutgoing ? 'bg-red-50' : 'bg-green-50'}`}>
      <svg className={`h-5 w-5 ${isOutgoing ? 'text-red-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isOutgoing ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
        )}
      </svg>
    </div>
  );
}

function formatAmount(amount: string, decimals?: number): string {
  const num = Number(amount);
  if (decimals && decimals > 0 && num > 1_000) {
    // Likely in smallest unit (SUN), convert
    return (num / Math.pow(10, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export default function TransactionList({ transactions, loading }: TransactionListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-surface-dim p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-border" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-border" />
                <div className="h-3 w-32 rounded bg-border" />
              </div>
              <div className="h-5 w-20 rounded bg-border" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <svg className="mb-3 h-12 w-12 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">거래 내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isOutgoing = tx.type === TxType.INTERNAL || tx.type === TxType.EXTERNAL_SEND;

        // Use withdrawal-specific status if available
        const badge = tx._isWithdrawalRequest && tx.withdrawalStatus
          ? withdrawalStatusConfig[tx.withdrawalStatus]
          : statusConfig[tx.status];

        return (
          <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-surface p-4 transition hover:bg-surface-dim">
            {typeIcon(tx.type)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{typeLabels[tx.type]}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-text-secondary">
                {isOutgoing
                  ? tx.toAddress
                    ? `→ ${tx.toAddress.slice(0, 8)}...${tx.toAddress.slice(-6)}`
                    : ''
                  : tx.fromAddress
                    ? `← ${tx.fromAddress.slice(0, 8)}...${tx.fromAddress.slice(-6)}`
                    : ''
                }
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${isOutgoing ? 'text-red-500' : 'text-green-600'}`}>
                {isOutgoing ? '-' : '+'}{formatAmount(tx.amount, tx.tokenDecimals)} {tx.tokenSymbol}
              </p>
              <p className="text-[10px] text-text-secondary">
                {new Date(tx.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
