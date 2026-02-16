'use client';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  COMPLETED: 'bg-success/10 text-success',
  APPROVED: 'bg-success/10 text-success',
  PENDING: 'bg-warning/10 text-warning',
  PENDING_APPROVAL: 'bg-warning/10 text-warning',
  PENDING_24H: 'bg-warning/10 text-warning',
  REJECTED: 'bg-danger/10 text-danger',
  FAILED: 'bg-danger/10 text-danger',
  SUSPENDED: 'bg-danger/10 text-danger',
  LOCKED: 'bg-danger/10 text-danger',
  INACTIVE: 'bg-text-secondary/10 text-text-secondary',
  UNLOCKED: 'bg-success/10 text-success',
  BROADCASTING: 'bg-primary/10 text-primary',
};

const statusLabels: Record<string, string> = {
  ACTIVE: '활성',
  COMPLETED: '완료',
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
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-text-secondary/10 text-text-secondary';
  const label = statusLabels[status] || status;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
