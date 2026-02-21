'use client';

import { useState } from 'react';
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
  fromUserId?: string | null;
  toUserId?: string | null;
  fromUser?: { email?: string; name?: string } | null;
  toUser?: { email?: string; name?: string } | null;
  txHash?: string | null;
  memo?: string | null;
  createdAt: string;
  withdrawalStatus?: WithdrawalStatus;
  _isWithdrawalRequest?: boolean;
}

interface TransactionListProps {
  transactions: TransactionItem[];
  loading?: boolean;
  currentUserId?: string;
}

const typeConfig: Record<string, { label: string; source: string; sourceClass: string }> = {
  [TxType.INTERNAL]: { label: '내부 송금', source: '내부', sourceClass: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  [TxType.EXTERNAL_SEND]: { label: '외부 출금', source: '온체인', sourceClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  [TxType.EXTERNAL_RECEIVE]: { label: '외부 입금', source: '온체인', sourceClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  [TxType.DEPOSIT]: { label: '입금', source: '온체인', sourceClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  [TxType.SWEEP]: { label: 'Sweep', source: '시스템', sourceClass: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
};

const statusConfig: Record<TxStatus, { label: string; className: string }> = {
  [TxStatus.PENDING]: { label: '대기중', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  [TxStatus.CONFIRMED]: { label: '완료', className: 'bg-green-500/15 text-green-400 border border-green-500/20' },
  [TxStatus.FAILED]: { label: '실패', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
};

const withdrawalStatusConfig: Record<WithdrawalStatus, { label: string; className: string }> = {
  [WithdrawalStatus.PENDING_24H]: { label: '24시간 대기', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/20' },
  [WithdrawalStatus.PENDING_APPROVAL]: { label: '승인 대기', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  [WithdrawalStatus.APPROVED]: { label: '승인됨', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  [WithdrawalStatus.REJECTED]: { label: '거절됨', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  [WithdrawalStatus.PROCESSING]: { label: '처리중', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  [WithdrawalStatus.COMPLETED]: { label: '완료', className: 'bg-green-500/15 text-green-400 border border-green-500/20' },
  [WithdrawalStatus.FAILED]: { label: '실패', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  [WithdrawalStatus.REFUNDED]: { label: '환불됨', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
};

function typeIcon(isOutgoing: boolean) {
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isOutgoing ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
      <svg className={`h-5 w-5 ${isOutgoing ? 'text-red-400' : 'text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function getCounterparty(tx: TransactionItem, isOutgoing: boolean): string {
  if (tx.type === TxType.INTERNAL) {
    if (isOutgoing) {
      const email = tx.toUser?.email;
      return email ? `→ ${email}` : '';
    }
    const email = tx.fromUser?.email;
    return email ? `← ${email}` : '';
  }
  // External: show truncated blockchain address
  if (isOutgoing) {
    return tx.toAddress ? `→ ${tx.toAddress.slice(0, 8)}...${tx.toAddress.slice(-6)}` : '';
  }
  return tx.fromAddress ? `← ${tx.fromAddress.slice(0, 8)}...${tx.fromAddress.slice(-6)}` : '';
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-[11px] text-gray-500">{label}</span>
      <span className={`text-right text-[11px] text-gray-300 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function TransactionList({ transactions, loading, currentUserId }: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  if (loading) {
    return (
      <div className="divide-y divide-white/[0.06]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <div className="h-8 w-8 rounded-full shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded shimmer" />
              <div className="h-3 w-40 rounded shimmer" />
            </div>
            <div className="h-5 w-24 rounded shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg className="mb-3 h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">거래 내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {transactions.map((tx) => {
        const isOutgoing = tx.type === TxType.INTERNAL
          ? (currentUserId ? tx.fromUserId === currentUserId : true)
          : tx.type === TxType.EXTERNAL_SEND;

        const badge = tx._isWithdrawalRequest && tx.withdrawalStatus
          ? withdrawalStatusConfig[tx.withdrawalStatus]
          : statusConfig[tx.status];

        const config = typeConfig[tx.type] ?? typeConfig[TxType.INTERNAL];
        const typeLabel = tx.type === TxType.INTERNAL
          ? (isOutgoing ? '내부 송금' : '내부 수신')
          : config.label;

        const isExpanded = expandedId === tx.id;

        return (
          <div key={tx.id}>
            <button
              onClick={() => toggle(tx.id)}
              className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
            >
              {typeIcon(isOutgoing)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white">{typeLabel}</span>
                  <span className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${config.sourceClass}`}>
                    {config.source}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {getCounterparty(tx, isOutgoing)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-semibold ${isOutgoing ? 'text-red-400' : 'text-green-400'}`}>
                  {isOutgoing ? '-' : '+'}{formatAmount(tx.amount, tx.tokenDecimals)} {tx.tokenSymbol}
                </p>
                <p className="text-[10px] text-gray-500">
                  {new Date(tx.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <svg
                className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable details */}
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="mb-3 ml-[52px] space-y-1.5 rounded-xl bg-white/[0.03] p-3">
                <DetailRow label="유형" value={typeLabel} />
                <DetailRow label="금액" value={`${formatAmount(tx.amount, tx.tokenDecimals)} ${tx.tokenSymbol}`} />
                <DetailRow label="보낸 주소" value={tx.fromAddress} mono />
                <DetailRow label="받는 주소" value={tx.toAddress} mono />
                {tx.txHash && (
                  <DetailRow label="TX Hash" value={tx.txHash} mono />
                )}
                {tx.memo && (
                  <DetailRow label="메모" value={tx.memo} />
                )}
                <DetailRow
                  label="일시"
                  value={new Date(tx.createdAt).toLocaleString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
