'use client';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
}

export default function StatsCard({ icon, label, value, change, changeType = 'neutral' }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        {change && (
          <span
            className={`text-xs font-medium ${
              changeType === 'up'
                ? 'text-success'
                : changeType === 'down'
                  ? 'text-danger'
                  : 'text-text-secondary'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-text">{value}</p>
        <p className="mt-1 text-sm text-text-secondary">{label}</p>
      </div>
    </div>
  );
}
