'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Clock,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { CATEGORY_COLORS, getCategoryTextColor } from '@/constants/menu';

interface ReservationItem {
  id: string;
  menuId: string;
  menuName: string;
  category: string;
  price: number;
  duration: number;
  orderIndex: number;
}

interface Reservation {
  id: string;
  totalPrice: number;
  totalDuration: number;
  menuSummary: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  paymentMethod?: string;
  note?: string;
  couponCode?: string | null;
  couponDiscount?: number;
  coupon?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
  } | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  items: ReservationItem[];
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const STATUS_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'CONFIRMED', label: '予約確定' },
  { value: 'COMPLETED', label: '来店済み' },
  { value: 'CANCELLED', label: 'キャンセル' },
  { value: 'NO_SHOW', label: '無断キャンセル' },
];

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  NO_SHOW: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: '予約確定',
  COMPLETED: '来店済み',
  CANCELLED: 'キャンセル',
  NO_SHOW: '無断キャンセル',
};

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Timeline constants
const TIMELINE_START_HOUR = 9;
const TIMELINE_END_HOUR = 20;
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 11 hours
const TIMELINE_TOTAL_MIN = TIMELINE_HOURS * 60; // 660 minutes

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

interface ConfirmDialog {
  isOpen: boolean;
  reservationId: string;
  reservationName: string;
  customerName: string;
  action: 'CANCELLED' | 'NO_SHOW' | 'CONFIRMED' | 'COMPLETED';
}

function AdminReservationsContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const highlightId = searchParams.get('highlight');

  const getInitialDate = () => {
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      }
    }
    return getToday();
  };

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = getInitialDate();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(getInitialDate);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    reservationId: '',
    reservationName: '',
    customerName: '',
    action: 'CANCELLED',
  });

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, statusFilter, page]);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) {
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        params.set('date', dateStr);
      }
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await fetch(`/api/admin/reservations?${params}`);
      const data = await res.json();
      const sortedReservations = (data.reservations || []).sort(
        (a: Reservation, b: Reservation) => a.startTime.localeCompare(b.startTime)
      );
      setReservations(sortedReservations);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchReservations();
  };

  const openConfirmDialog = (reservation: Reservation, action: ConfirmDialog['action']) => {
    setConfirmDialog({
      isOpen: true,
      reservationId: reservation.id,
      reservationName: reservation.menuSummary,
      customerName: reservation.user.name || '名前未登録',
      action,
    });
  };

  const handleStatusChange = async () => {
    const { reservationId, action } = confirmDialog;
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });

      if (res.ok) {
        setReservations((prev) =>
          prev.map((r) => (r.id === reservationId ? { ...r, status: action as Reservation['status'] } : r))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Calendar generation
  const generateCalendarDays = (): (Date | null)[] => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`;
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium">予約管理</h1>
            <p className="text-sm text-gray-500 mt-1">予約の確認・ステータス管理</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-medium">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="text-xs text-gray-500 py-1">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((date, i) => (
                  <button
                    key={i}
                    onClick={() => date && setSelectedDate(date)}
                    disabled={!date}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                      !date
                        ? ''
                        : isSelected(date)
                          ? 'bg-gray-800 text-white'
                          : isToday(date)
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'hover:bg-gray-100'
                    }`}
                  >
                    {date?.getDate()}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setSelectedDate(getToday())}
                  className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  今日
                </button>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  全日付
                </button>
              </div>
            </div>
          </div>

          {/* Reservations List */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="名前・電話・メールで検索"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-400"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  検索
                </button>
              </div>
            </div>

            {/* Date label */}
            {selectedDate && (
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{formatDate(selectedDate)}</span>
              </div>
            )}

            {/* Horizontal Timeline */}
            {selectedDate && !isLoading && reservations.filter((r) => r.status !== 'CANCELLED').length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4">
                <div className="px-2 lg:px-4">
                  {/* Time labels */}
                  <div className="relative h-7 mb-2">
                    {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
                      const left = (i / TIMELINE_HOURS) * 100;
                      const translateClass = i === 0
                        ? 'translate-x-0'
                        : i === TIMELINE_HOURS
                          ? '-translate-x-full'
                          : '-translate-x-1/2';
                      return (
                        <div
                          key={i}
                          className={`absolute text-xs text-gray-400 ${translateClass}`}
                          style={{ left: `${left}%` }}
                        >
                          {TIMELINE_START_HOUR + i}:00
                        </div>
                      );
                    })}
                  </div>

                  {/* Timeline bar */}
                  {(() => {
                    const active = reservations.filter((r) => r.status !== 'CANCELLED');
                    // Compute rows for overlapping reservations
                    const rows: { reservation: Reservation; row: number }[] = [];
                    const sorted = [...active].sort((a, b) => a.startTime.localeCompare(b.startTime));

                    for (const r of sorted) {
                      const rStart = timeToMinutes(r.startTime);
                      const rEnd = timeToMinutes(r.endTime);
                      // Find a row where this doesn't overlap
                      let row = 0;
                      while (true) {
                        const rowEntries = rows.filter((e) => e.row === row);
                        const hasOverlap = rowEntries.some((e) => {
                          const eStart = timeToMinutes(e.reservation.startTime);
                          const eEnd = timeToMinutes(e.reservation.endTime);
                          return rStart < eEnd && rEnd > eStart;
                        });
                        if (!hasOverlap) break;
                        row++;
                      }
                      rows.push({ reservation: r, row });
                    }

                    const maxRow = rows.length > 0 ? Math.max(...rows.map((r) => r.row)) : 0;
                    const ROW_HEIGHT = 44; // px per row
                    const barHeight = (maxRow + 1) * ROW_HEIGHT + 8;

                    return (
                      <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: `${barHeight}px` }}>
                        {/* Grid lines */}
                        <div className="absolute inset-0">
                          {Array.from({ length: TIMELINE_HOURS * 3 + 1 }, (_, i) => {
                            const isHourLine = i % 3 === 0;
                            const left = (i / (TIMELINE_HOURS * 3)) * 100;
                            return (
                              <div
                                key={i}
                                className={`absolute top-0 bottom-0 ${
                                  isHourLine ? 'border-l border-gray-300' : 'border-l border-gray-200/60'
                                }`}
                                style={{ left: `${left}%` }}
                              />
                            );
                          })}
                        </div>

                        {/* Current time indicator */}
                        {selectedDate.toDateString() === new Date().toDateString() && (() => {
                          const now = new Date();
                          const nowMin = now.getHours() * 60 + now.getMinutes();
                          const startMin = TIMELINE_START_HOUR * 60;
                          const endMin = TIMELINE_END_HOUR * 60;
                          if (nowMin >= startMin && nowMin <= endMin) {
                            const left = ((nowMin - startMin) / TIMELINE_TOTAL_MIN) * 100;
                            return (
                              <div className="absolute top-0 bottom-0 z-20" style={{ left: `${left}%` }}>
                                <div className="w-2 h-2 rounded-full bg-red-500 absolute -left-1 -top-0.5" />
                                <div className="h-full border-l-2 border-red-500" />
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Reservation blocks */}
                        {rows.map(({ reservation: r, row }) => {
                          const startMin = timeToMinutes(r.startTime) - TIMELINE_START_HOUR * 60;
                          const endMin = timeToMinutes(r.endTime) - TIMELINE_START_HOUR * 60;
                          const left = (startMin / TIMELINE_TOTAL_MIN) * 100;
                          const width = ((endMin - startMin) / TIMELINE_TOTAL_MIN) * 100;
                          const top = row * ROW_HEIGHT + 4;
                          const isFaded = r.status === 'NO_SHOW';

                          return (
                            <div
                              key={r.id}
                              className={`absolute flex rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all cursor-default ${
                                isFaded ? 'opacity-40' : ''
                              } ${highlightId === r.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 3)}%`,
                                top: `${top}px`,
                                height: `${ROW_HEIGHT - 6}px`,
                              }}
                              title={`${r.startTime}〜${r.endTime} ${r.menuSummary} - ${r.user.name || '名前未登録'}`}
                            >
                              {r.items.length > 0 ? (
                                r.items.map((item, idx) => {
                                  const segmentWidth = (item.duration / r.totalDuration) * 100;
                                  return (
                                    <div
                                      key={item.id}
                                      className={`h-full flex items-center justify-center ${idx === 0 ? 'rounded-l-md' : ''} ${idx === r.items.length - 1 ? 'rounded-r-md' : ''}`}
                                      style={{
                                        backgroundColor: CATEGORY_COLORS[item.category] || '#888',
                                        width: `${segmentWidth}%`,
                                      }}
                                    >
                                      {segmentWidth > 25 && (
                                        <span
                                          className="text-[10px] font-medium truncate px-1"
                                          style={{ color: getCategoryTextColor(item.category) }}
                                        >
                                          {item.menuName.split('（')[0]}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="h-full w-full bg-blue-500 flex items-center px-2">
                                  <span className="text-white text-[10px] font-medium truncate">
                                    {r.menuSummary}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-12 text-center text-gray-500">読み込み中...</div>
              ) : reservations.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  予約がありません
                </div>
              ) : (
                reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className={`p-4 md:p-5 ${highlightId === reservation.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      {/* Time */}
                      <div className="flex-shrink-0 w-20">
                        <p className="font-medium">{reservation.startTime}</p>
                        <p className="text-xs text-gray-400">~{reservation.endTime}</p>
                      </div>

                      {/* Color bar */}
                      <div className="flex gap-0.5 w-12 flex-shrink-0 mt-1">
                        {reservation.items.map((item) => (
                          <div
                            key={item.id}
                            className="h-5 rounded"
                            style={{
                              backgroundColor: CATEGORY_COLORS[item.category] || '#888',
                              flex: item.duration,
                            }}
                            title={item.menuName}
                          />
                        ))}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_STYLES[reservation.status] || ''}`}>
                            {STATUS_LABELS[reservation.status] || reservation.status}
                          </span>
                          {reservation.paymentMethod === 'ONLINE' && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                              カード決済
                            </span>
                          )}
                          {reservation.coupon && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                              {reservation.coupon.code}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate">{reservation.menuSummary}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {reservation.user.name || '名前未登録'}
                          {reservation.user.phone && ` / ${reservation.user.phone}`}
                          {reservation.user.email && ` / ${reservation.user.email}`}
                        </p>
                        {reservation.note && (
                          <p className="text-xs text-gray-400 mt-1">備考: {reservation.note}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-amber-600">¥{reservation.totalPrice.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{reservation.totalDuration}分</p>
                        {reservation.couponDiscount ? (
                          <p className="text-xs text-red-500">-¥{reservation.couponDiscount.toLocaleString()}</p>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {reservation.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => openConfirmDialog(reservation, 'COMPLETED')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="施術完了"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openConfirmDialog(reservation, 'CANCELLED')}
                              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                              title="キャンセル"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openConfirmDialog(reservation, 'NO_SHOW')}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="無断キャンセル"
                            >
                              <Clock className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {(reservation.status === 'CANCELLED' || reservation.status === 'NO_SHOW') && (
                          <button
                            onClick={() => openConfirmDialog(reservation, 'CONFIRMED')}
                            className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            復元
                          </button>
                        )}
                        {reservation.status === 'COMPLETED' && (
                          <span className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg">
                            完了
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${
                confirmDialog.action === 'CONFIRMED' ? 'bg-blue-100 text-blue-600'
                  : confirmDialog.action === 'COMPLETED' ? 'bg-green-100 text-green-600'
                    : confirmDialog.action === 'CANCELLED' ? 'bg-gray-100 text-gray-600'
                      : 'bg-red-100 text-red-600'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-medium">
                {confirmDialog.action === 'CONFIRMED' && '予約を復元'}
                {confirmDialog.action === 'COMPLETED' && '施術完了'}
                {confirmDialog.action === 'CANCELLED' && 'キャンセル確認'}
                {confirmDialog.action === 'NO_SHOW' && '無断キャンセル確認'}
              </h3>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-lg">{confirmDialog.reservationName}</p>
              <p className="text-gray-500">{confirmDialog.customerName} 様</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3 px-4 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={handleStatusChange}
                className={`flex-1 py-3 px-4 text-white rounded-lg transition-colors ${
                  confirmDialog.action === 'CONFIRMED' ? 'bg-blue-600 hover:bg-blue-700'
                    : confirmDialog.action === 'COMPLETED' ? 'bg-green-600 hover:bg-green-700'
                      : confirmDialog.action === 'CANCELLED' ? 'bg-gray-600 hover:bg-gray-700'
                        : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReservationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">読み込み中...</p></div>}>
      <AdminReservationsContent />
    </Suspense>
  );
}
