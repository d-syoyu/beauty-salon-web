'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CalendarOff,
  Clock,
  XCircle,
  Scissors,
  AlertTriangle,
  X,
  Users,
  Menu,
  CreditCard,
  Mail,
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
  status: string;
  staffId: string | null;
  staffName: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  staff?: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  items: ReservationItem[];
}

interface Stats {
  todayCount: number;
  weekCount: number;
  totalReservations: number;
  weekStartStr: string;
  weekEndStr: string;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const timeToMinutes = (time: string) => {
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

interface Holiday {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayHolidays, setTodayHolidays] = useState<Holiday[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    reservationId: '',
    reservationName: '',
    customerName: '',
    action: 'CANCELLED',
  });

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchData = async () => {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Fetch today's reservations
        const res = await fetch(`/api/admin/reservations?date=${todayStr}&limit=100`);
        const data = await res.json();

        const confirmedToday = (data.reservations || []).filter(
          (r: Reservation) => r.status === 'CONFIRMED'
        );
        confirmedToday.sort((a: Reservation, b: Reservation) =>
          a.startTime.localeCompare(b.startTime)
        );
        setTodayReservations(confirmedToday);

        // Fetch analytics
        const analyticsRes = await fetch('/api/admin/analytics');
        const analyticsData = await analyticsRes.json();
        setStats({
          todayCount: analyticsData.todayCount,
          weekCount: analyticsData.weekCount,
          totalReservations: analyticsData.totalReservations,
          weekStartStr: analyticsData.weekStartStr,
          weekEndStr: analyticsData.weekEndStr,
        });

        // Fetch today's holidays
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const holidayRes = await fetch(`/api/admin/holidays?year=${year}&month=${month}`);
        const holidayData = await holidayRes.json();
        const holidaysArray = Array.isArray(holidayData) ? holidayData : [];
        const todayHols = holidaysArray.filter((h: Holiday) => {
          const holidayDateStr = typeof h.date === 'string' ? h.date.slice(0, 10) : '';
          return holidayDateStr === todayStr;
        });
        setTodayHolidays(todayHols);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [status, session]);

  const openConfirmDialog = (
    reservation: Reservation,
    action: 'CANCELLED' | 'NO_SHOW' | 'CONFIRMED' | 'COMPLETED'
  ) => {
    setConfirmDialog({
      isOpen: true,
      reservationId: reservation.id,
      reservationName: reservation.menuSummary,
      customerName: reservation.user.name || '名前未登録',
      action,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
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
        if (action === 'CONFIRMED') {
          // Restore - re-add to list
          const updated = await res.json();
          setTodayReservations((prev) => {
            const existing = prev.find((r) => r.id === reservationId);
            if (existing) {
              return prev.map((r) => (r.id === reservationId ? { ...r, status: action } : r));
            }
            return [...prev, updated].sort((a, b) => a.startTime.localeCompare(b.startTime));
          });
        } else {
          // Remove from today's confirmed list
          setTodayReservations((prev) => prev.filter((r) => r.id !== reservationId));
        }
        if (stats) {
          setStats({ ...stats, todayCount: Math.max(0, stats.todayCount - (action !== 'CONFIRMED' ? 1 : -1)) });
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      closeConfirmDialog();
    }
  };

  const today = new Date();

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium">管理画面</h1>
            <p className="text-base md:text-lg text-gray-500">
              {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日（{WEEKDAYS[today.getDay()]}）
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{session?.user?.name || 'ゲスト管理者'}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
              <span className="text-base md:text-lg text-gray-500">本日の予約</span>
            </div>
            <p className="text-3xl md:text-4xl font-light">{stats?.todayCount ?? '-'}</p>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 md:w-7 md:h-7 text-blue-500" />
              <span className="text-base md:text-lg text-gray-500">
                今週の予約
                {stats && (
                  <span className="text-sm text-gray-400 ml-1">
                    （{stats.weekStartStr}~{stats.weekEndStr}）
                  </span>
                )}
              </span>
            </div>
            <p className="text-3xl md:text-4xl font-light">{stats?.weekCount ?? '-'}</p>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Scissors className="w-6 h-6 md:w-7 md:h-7 text-amber-600" />
              <span className="text-base md:text-lg text-gray-500">Webからの予約数</span>
            </div>
            <p className="text-3xl md:text-4xl font-light">{stats?.totalReservations ?? '-'}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <Link
            href="/admin/reservations"
            className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">予約管理</p>
              <p className="text-xs text-gray-500 hidden sm:block">予約一覧・編集</p>
            </div>
          </Link>

          <Link
            href="/admin/menus"
            className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Menu className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-sm">メニュー管理</p>
              <p className="text-xs text-gray-500 hidden sm:block">メニュー・カテゴリ</p>
            </div>
          </Link>

          <Link
            href="/admin/staff"
            className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <Scissors className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="font-medium text-sm">スタッフ管理</p>
              <p className="text-xs text-gray-500 hidden sm:block">スタイリスト・シフト</p>
            </div>
          </Link>

          <Link
            href="/admin/customers"
            className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">顧客管理</p>
              <p className="text-xs text-gray-500 hidden sm:block">顧客情報</p>
            </div>
          </Link>

          <Link
            href="/admin/holidays"
            className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-2 bg-red-500/10 rounded-lg">
              <CalendarOff className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-sm">営業管理</p>
              <p className="text-xs text-gray-500 hidden sm:block">定休日・不定休</p>
            </div>
          </Link>

          <Link
            href="/admin/pos"
            className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm">会計・売上</p>
              <p className="text-xs text-gray-500 hidden sm:block">POS・レポート</p>
            </div>
          </Link>

          <Link
            href="/admin/newsletter"
            className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-2 bg-teal-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="font-medium text-sm">ニュースレター</p>
              <p className="text-xs text-gray-500 hidden sm:block">メール配信</p>
            </div>
          </Link>
        </div>

        {/* Today's Reservations */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 md:p-8 border-b border-gray-100">
            <h2 className="text-lg md:text-xl font-medium">本日のご予約</h2>
          </div>

          {isLoading ? (
            <div className="p-12 md:p-16 text-center text-lg text-gray-500">読み込み中...</div>
          ) : (
            <>
              {/* Holiday notice */}
              {todayHolidays.length > 0 && (
                <div className="p-4 bg-red-50 border-b border-red-100">
                  {todayHolidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center gap-2 text-red-600">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {!holiday.startTime || !holiday.endTime
                          ? `終日休業${holiday.reason ? `（${holiday.reason}）` : ''}`
                          : `${holiday.startTime}〜${holiday.endTime} 休業${holiday.reason ? `（${holiday.reason}）` : ''}`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline (desktop) - Per-stylist lanes */}
              <div className="hidden md:block p-4 md:p-6">
                <div className="mb-6 px-6 lg:px-8">
                  {(() => {
                    const TIMELINE_HOURS = 11;
                    const TIMELINE_TOTAL_MIN = TIMELINE_HOURS * 60;
                    const LANE_HEIGHT = 44;
                    // Group reservations by staff
                    const staffLanes = new Map<string, { name: string; reservations: Reservation[] }>();
                    const unassigned: Reservation[] = [];
                    for (const r of todayReservations) {
                      const sid = r.staffId || r.staff?.id;
                      const sname = r.staffName || r.staff?.name;
                      if (sid && sname) {
                        if (!staffLanes.has(sid)) {
                          staffLanes.set(sid, { name: sname, reservations: [] });
                        }
                        staffLanes.get(sid)!.reservations.push(r);
                      } else {
                        unassigned.push(r);
                      }
                    }
                    if (unassigned.length > 0) {
                      staffLanes.set('__unassigned', { name: '未割当', reservations: unassigned });
                    }
                    const lanes = Array.from(staffLanes.entries());
                    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                    return (
                      <div>
                        {/* Time labels */}
                        <div className="relative h-7 mb-2 ml-20">
                          {Array.from({ length: 12 }, (_, i) => {
                            const left = (i / 11) * 100;
                            const translateClass = i === 0
                              ? 'translate-x-0'
                              : i === 11
                                ? '-translate-x-full'
                                : '-translate-x-1/2';
                            return (
                              <div
                                key={i}
                                className={`absolute text-xs md:text-sm text-gray-400 ${translateClass}`}
                                style={{ left: `${left}%` }}
                              >
                                {i + 9}:00
                              </div>
                            );
                          })}
                        </div>

                        {/* Per-staff lanes */}
                        {lanes.map(([staffId, lane]) => (
                          <div key={staffId} className="flex items-stretch mb-1">
                            <div className="w-20 flex-shrink-0 flex items-center pr-2">
                              <span className="text-xs font-medium text-gray-600 truncate">{lane.name}</span>
                            </div>
                            <div className="flex-1 relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: `${LANE_HEIGHT}px` }}>
                              {/* Grid lines */}
                              <div className="absolute inset-0">
                                {Array.from({ length: 34 }, (_, i) => {
                                  const isHourLine = i % 3 === 0;
                                  const left = (i / 33) * 100;
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

                              {/* Holidays */}
                              {todayHolidays.map((holiday) => {
                                if (!holiday.startTime || !holiday.endTime) {
                                  return (
                                    <div key={holiday.id} className="absolute inset-0 bg-red-500/20" title={holiday.reason || '終日休業'} />
                                  );
                                }
                                const hStartMin = timeToMinutes(holiday.startTime) - 540;
                                const hEndMin = timeToMinutes(holiday.endTime) - 540;
                                const left = Math.max(0, (hStartMin / TIMELINE_TOTAL_MIN) * 100);
                                const width = Math.min(100 - left, ((hEndMin - hStartMin) / TIMELINE_TOTAL_MIN) * 100);
                                return (
                                  <div key={holiday.id} className="absolute top-0 bottom-0 bg-red-500/20" style={{ left: `${left}%`, width: `${width}%` }} />
                                );
                              })}

                              {/* Reservations */}
                              {lane.reservations.map((reservation) => {
                                const startMin = timeToMinutes(reservation.startTime) - 540;
                                const endMin = timeToMinutes(reservation.endTime) - 540;
                                const left = (startMin / TIMELINE_TOTAL_MIN) * 100;
                                const width = ((endMin - startMin) / TIMELINE_TOTAL_MIN) * 100;
                                return (
                                  <button
                                    key={reservation.id}
                                    onClick={() => router.push(`/admin/reservations?date=${dateStr}&highlight=${reservation.id}`)}
                                    className="absolute top-1 bottom-1 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all flex cursor-pointer hover:scale-[1.02] active:scale-100"
                                    style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                                    title={`${reservation.startTime}〜${reservation.endTime} ${reservation.menuSummary} - ${reservation.user.name || '名前未登録'}`}
                                  >
                                    {reservation.items.length > 0 ? (
                                      reservation.items.map((item, idx) => {
                                        const segmentWidth = (item.duration / reservation.totalDuration) * 100;
                                        return (
                                          <div
                                            key={item.id}
                                            className={`h-full flex items-center justify-center ${idx === 0 ? 'rounded-l-md' : ''} ${idx === reservation.items.length - 1 ? 'rounded-r-md' : ''}`}
                                            style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#888', width: `${segmentWidth}%` }}
                                          >
                                            {segmentWidth > 20 && (
                                              <span className="text-xs font-medium truncate px-1" style={{ color: getCategoryTextColor(item.category) }}>
                                                {item.menuName.split('（')[0]}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="h-full w-full bg-blue-500 flex items-center px-2">
                                        <span className="text-white text-xs font-medium truncate">{reservation.menuSummary}</span>
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Empty state */}
                        {lanes.length === 0 && todayHolidays.length > 0 && (
                          <div className="relative h-14 bg-gray-50 rounded-lg overflow-hidden ml-20">
                            {todayHolidays.map((holiday) => {
                              if (!holiday.startTime || !holiday.endTime) {
                                return (
                                  <div key={holiday.id} className="absolute inset-0 bg-red-500/20 flex items-center justify-center" title={holiday.reason || '終日休業'}>
                                    <span className="text-red-500 text-sm font-medium">{holiday.reason || '終日休業'}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Reservation List */}
                <div className="divide-y divide-gray-100">
                  {todayReservations.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      本日の予約はありません
                    </div>
                  )}
                  {todayReservations.map((reservation) => (
                    <div key={reservation.id} className="py-3 md:py-4 flex items-center gap-3 md:gap-4">
                      <div className="w-16 md:w-20 lg:w-24 flex-shrink-0">
                        <span className="text-base md:text-lg font-medium">{reservation.startTime}</span>
                        <span className="text-xs text-gray-400 ml-1">~{reservation.endTime}</span>
                      </div>

                      <div className="flex gap-0.5 w-16 flex-shrink-0">
                        {reservation.items.map((item) => (
                          <div
                            key={item.id}
                            className="h-6 rounded"
                            style={{
                              backgroundColor: CATEGORY_COLORS[item.category] || '#888',
                              flex: item.duration,
                            }}
                            title={item.menuName}
                          />
                        ))}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">{reservation.menuSummary}</p>
                        <p className="text-xs md:text-sm text-gray-500 truncate">
                          {reservation.user.name || '名前未登録'}
                          {reservation.staffName && (
                            <span className="ml-2 text-pink-600">
                              担当: {reservation.staffName}
                            </span>
                          )}
                          <span className="hidden lg:inline">
                            {reservation.user.phone && ` / ${reservation.user.phone}`}
                          </span>
                        </p>
                      </div>

                      <div className="text-sm md:text-base text-amber-600 flex-shrink-0">
                        ¥{reservation.totalPrice.toLocaleString()}
                      </div>

                      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        <button
                          onClick={() => openConfirmDialog(reservation, 'COMPLETED')}
                          className="px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors min-h-[40px]"
                          title="施術完了"
                        >
                          完了
                        </button>
                        <button
                          onClick={() => openConfirmDialog(reservation, 'CANCELLED')}
                          className="p-2 md:p-2.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                          title="キャンセル"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openConfirmDialog(reservation, 'NO_SHOW')}
                          className="p-2 md:p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="無断キャンセル"
                        >
                          <Clock className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile List View */}
              <div className="md:hidden divide-y divide-gray-100">
                {todayReservations.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    本日の予約はありません
                  </div>
                )}
                {todayReservations.map((reservation) => (
                  <div key={reservation.id} className="p-4 flex items-center gap-3">
                    <div className="flex-shrink-0 text-center w-16">
                      <p className="text-base font-medium">{reservation.startTime}</p>
                      <p className="text-xs text-gray-400">~{reservation.endTime}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex gap-0.5 mb-1">
                        {reservation.items.map((item) => (
                          <div
                            key={item.id}
                            className="h-1.5 rounded-full"
                            style={{
                              backgroundColor: CATEGORY_COLORS[item.category] || '#888',
                              flex: item.duration,
                            }}
                          />
                        ))}
                      </div>
                      <p className="font-medium text-sm truncate">{reservation.menuSummary}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {reservation.user.name || '名前未登録'}
                        {reservation.staffName && (
                          <span className="ml-1 text-pink-600">・{reservation.staffName}</span>
                        )}
                      </p>
                      <p className="text-xs text-amber-600">¥{reservation.totalPrice.toLocaleString()}</p>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <button
                        onClick={() => openConfirmDialog(reservation, 'COMPLETED')}
                        className="px-2 py-1.5 text-xs text-green-600 bg-green-50 rounded-lg"
                      >
                        完了
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openConfirmDialog(reservation, 'CANCELLED')}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openConfirmDialog(reservation, 'NO_SHOW')}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeConfirmDialog} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={closeConfirmDialog}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${
                confirmDialog.action === 'CONFIRMED'
                  ? 'bg-blue-100 text-blue-600'
                  : confirmDialog.action === 'COMPLETED'
                    ? 'bg-green-100 text-green-600'
                    : confirmDialog.action === 'CANCELLED'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-red-100 text-red-600'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-medium">
                {confirmDialog.action === 'CONFIRMED' && '予約を復元'}
                {confirmDialog.action === 'COMPLETED' && '施術完了確認'}
                {confirmDialog.action === 'CANCELLED' && 'キャンセル確認'}
                {confirmDialog.action === 'NO_SHOW' && '無断キャンセル確認'}
              </h3>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-2">
                {confirmDialog.action === 'CONFIRMED' && '以下の予約を元に戻しますか？'}
                {confirmDialog.action === 'COMPLETED' && '以下の予約を施術完了にしますか？'}
                {confirmDialog.action === 'CANCELLED' && '以下の予約をキャンセルにしますか？'}
                {confirmDialog.action === 'NO_SHOW' && '以下の予約を無断キャンセルにしますか？'}
              </p>
              <p className="font-medium text-lg">{confirmDialog.reservationName}</p>
              <p className="text-gray-500">{confirmDialog.customerName} 様</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeConfirmDialog}
                className="flex-1 py-3 px-4 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={handleStatusChange}
                className={`flex-1 py-3 px-4 text-white rounded-lg transition-colors ${
                  confirmDialog.action === 'CONFIRMED'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : confirmDialog.action === 'COMPLETED'
                      ? 'bg-green-600 hover:bg-green-700'
                      : confirmDialog.action === 'CANCELLED'
                        ? 'bg-gray-600 hover:bg-gray-700'
                        : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmDialog.action === 'CONFIRMED' && '予約を復元する'}
                {confirmDialog.action === 'COMPLETED' && '完了にする'}
                {confirmDialog.action === 'CANCELLED' && 'キャンセルする'}
                {confirmDialog.action === 'NO_SHOW' && '無断キャンセルにする'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
