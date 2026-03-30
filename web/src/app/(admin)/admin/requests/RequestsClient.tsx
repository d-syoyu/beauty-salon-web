'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardList, X } from 'lucide-react';
import { formatLocalDate } from '@/lib/date-utils';

type RequestType = 'attendance_correction' | 'leave' | 'overtime';
type RequestStatus = 'submitted' | 'approved' | 'rejected';
type FilterTab = '全て' | '勤怠修正' | '休暇' | '残業';

export type RequestItem = {
  requestKey: string;
  type: RequestType;
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  date: string;
  status: RequestStatus;
  summary: string;
  note?: string | null;
  createdAt: string;
};

const FILTER_TABS: FilterTab[] = ['全て', '勤怠修正', '休暇', '残業'];

const TYPE_LABELS: Record<RequestType, string> = {
  attendance_correction: '勤怠修正',
  leave: '休暇',
  overtime: '残業',
};

const TYPE_COLORS: Record<RequestType, string> = {
  attendance_correction: 'bg-blue-100 text-blue-700',
  leave: 'bg-yellow-100 text-yellow-700',
  overtime: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: '未処理',
  approved: '承認済',
  rejected: '却下',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-100 text-gray-500',
};

const FILTER_MAP: Record<FilterTab, (r: RequestItem) => boolean> = {
  '全て': () => true,
  '勤怠修正': (r) => r.type === 'attendance_correction',
  '休暇': (r) => r.type === 'leave',
  '残業': (r) => r.type === 'overtime',
};

function getInitials(name: string): string {
  return name.slice(0, 2);
}

export default function RequestsClient({ initialRequests }: { initialRequests: RequestItem[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('全て');
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  async function handleApprove(requestKey: string) {
    setProcessingKey(requestKey);
    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestKey)}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setRequests(prev =>
          prev.map(r => r.requestKey === requestKey ? { ...r, status: 'approved' as RequestStatus } : r)
        );
        router.refresh();
      } else {
        alert('承認に失敗しました');
      }
    } finally {
      setProcessingKey(null);
    }
  }

  async function handleReject(requestKey: string) {
    setProcessingKey(requestKey);
    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestKey)}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        setRequests(prev =>
          prev.map(r => r.requestKey === requestKey ? { ...r, status: 'rejected' as RequestStatus } : r)
        );
        router.refresh();
      } else {
        alert('却下に失敗しました');
      }
    } finally {
      setProcessingKey(null);
    }
  }

  const filtered = requests.filter(FILTER_MAP[activeFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-1 overflow-x-auto gap-1">
          {FILTER_TABS.map(tab => {
            const tabCount = tab === '全て'
              ? requests.filter(r => r.status === 'submitted').length
              : requests.filter(r => FILTER_MAP[tab](r) && r.status === 'submitted').length;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeFilter === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tabCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                    {tabCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 max-w-2xl mx-auto">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <ClipboardList className="w-10 h-10" />
            <p className="text-sm">申請はありません</p>
          </div>
        ) : (
          filtered.map(req => (
            <RequestCard
              key={req.requestKey}
              request={req}
              processing={processingKey === req.requestKey}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RequestCard({
  request,
  processing,
  onApprove,
  onReject,
}: {
  request: RequestItem;
  processing: boolean;
  onApprove: (key: string) => void;
  onReject: (key: string) => void;
}) {
  const dateStr = request.date
    ? formatLocalDate(new Date(request.date))
    : '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-indigo-700">
            {getInitials(request.staffName)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[request.type]}`}>
              {TYPE_LABELS[request.type]}
            </span>
            <span className="text-sm font-medium text-gray-900">{request.staffName}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-1">
            {dateStr}　{request.summary}
          </p>

          {request.note && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{request.note}</p>
          )}
        </div>
      </div>

      {request.status === 'submitted' && (
        <div className="mt-3 flex gap-2 pl-13">
          <button
            onClick={() => onApprove(request.requestKey)}
            disabled={processing}
            className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            承認
          </button>
          <button
            onClick={() => onReject(request.requestKey)}
            disabled={processing}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            却下
          </button>
        </div>
      )}
    </div>
  );
}
