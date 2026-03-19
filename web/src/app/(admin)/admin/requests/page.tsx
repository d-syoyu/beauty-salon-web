'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Check, ClipboardList, RefreshCcw, X } from 'lucide-react';
import { formatLocalDate } from '@/lib/date-utils';

type RequestType = 'attendance_correction' | 'leave' | 'overtime';
type RequestStatus = 'submitted' | 'approved' | 'rejected';

type RequestItem = {
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

type FilterTab = '全て' | '勤怠修正' | '休暇' | '残業';

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

export default function RequestsPage() {
  const { data: session, status } = useSession();
  const canLoad = status === 'authenticated' && session?.user?.role === 'ADMIN';
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('全て');
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!canLoad) return; load(); }, [canLoad, load]);

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
      } else {
        alert('却下に失敗しました');
      }
    } finally {
      setProcessingKey(null);
    }
  }

  const pendingCount = requests.filter(r => r.status === 'submitted').length;
  const filtered = requests.filter(FILTER_MAP[activeFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/admin/staff" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900">申請承認</h1>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                  {pendingCount}件
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">勤怠修正・休暇・残業の申請を管理</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <RefreshCcw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex overflow-x-auto px-4 pb-0 gap-1 max-w-2xl mx-auto">
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
      </header>

      {/* Content */}
      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : filtered.length === 0 ? (
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
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-indigo-700">
            {getInitials(request.staffName)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Type badge + name + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[request.type]}`}>
              {TYPE_LABELS[request.type]}
            </span>
            <span className="text-sm font-medium text-gray-900">{request.staffName}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>
          </div>

          {/* Date + summary */}
          <p className="text-sm text-gray-600 mt-1">
            {dateStr}　{request.summary}
          </p>

          {/* Note */}
          {request.note && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{request.note}</p>
          )}
        </div>
      </div>

      {/* Action buttons - only for pending */}
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
