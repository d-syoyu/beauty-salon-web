import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ReservationStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'PENDING';

const STATUS_CONFIG: Record<ReservationStatus, { label: string; className: string }> = {
  CONFIRMED: {
    label: '確定',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
  COMPLETED: {
    label: '完了',
    className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  CANCELLED: {
    label: 'キャンセル',
    className: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100',
  },
  NO_SHOW: {
    label: '無断欠席',
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
  },
  PENDING: {
    label: '保留',
    className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as ReservationStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
