'use client';

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  COMPLETED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  CONFIRMED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  APPROVED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  PENDING: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse-dot' },
  PENDING_APPROVAL: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse-dot' },
  PENDING_24H: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse-dot' },
  REJECTED: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  FAILED: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  SUSPENDED: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  LOCKED: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  INACTIVE: { bg: 'bg-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-400' },
  UNLOCKED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  BROADCASTING: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400 animate-pulse-dot' },
  PROCESSING: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400 animate-pulse-dot' },
};

const statusLabels: Record<string, string> = {
  ACTIVE: '활성',
  COMPLETED: '완료',
  CONFIRMED: '확인됨',
  APPROVED: '승인',
  PENDING: '대기',
  PENDING_APPROVAL: '승인 대기',
  PENDING_24H: '24시간 대기',
  REJECTED: '거부',
  FAILED: '실패',
  SUSPENDED: '정지',
  LOCKED: '잠금',
  INACTIVE: '비활성',
  UNLOCKED: '해제',
  BROADCASTING: '전송 중',
  PROCESSING: '처리 중',
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: 'bg-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-400' };
  const label = statusLabels[status] || status;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}
