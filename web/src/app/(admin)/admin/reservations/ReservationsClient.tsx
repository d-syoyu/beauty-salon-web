'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Clock,
  CreditCard,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PageHeader } from '@/components/admin/PageHeader';

export interface ReservationItem {
  id: string;
  menuId: string;
  menuName: string;
  category: string;
  price: number;
  duration: number;
  orderIndex: number;
}

export interface Reservation {
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
  staffId?: string | null;
  staffName?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  coupon?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
  } | null;
  staff?: {
    id: string;
    name: string;
    image: string | null;
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

const ACTION_CONFIG: Record<string, { label: string; title: string; desc: string }> = {
  CONFIRMED: { label: '予約を復元する', title: '予約を復元', desc: '以下の予約を元に戻しますか？' },
  COMPLETED: { label: '完了にする', title: '施術完了確認', desc: '以下の予約を施術完了にしますか？' },
  CANCELLED: { label: 'キャンセルする', title: 'キャンセル確認', desc: '以下の予約をキャンセルにしますか？' },
  NO_SHOW: { label: '無断キャンセルにする', title: '無断キャンセル確認', desc: '以下の予約を無断キャンセルにしますか？' },
};

const ACTION_VARIANTS = {
  CONFIRMED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'warning',
  NO_SHOW: 'destructive',
} as const;

// Timeline constants
const TIMELINE_START_HOUR = 9;
const TIMELINE_END_HOUR = 20;
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
const TIMELINE_TOTAL_MIN = TIMELINE_HOURS * 60;
const TIMELINE_LABEL_WIDTH_PX = 80;
const TIMELINE_HOUR_WIDTH_PX = 64;
const TIMELINE_AREA_MIN_WIDTH_PX = TIMELINE_HOURS * TIMELINE_HOUR_WIDTH_PX;

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const getReservationItemColor = (
  item: ReservationItem,
  menuCategoryColors: Record<string, string>,
  categoryColors: Record<string, string>
): string => menuCategoryColors[item.menuId] || categoryColors[item.category] || '#888';

const getReadableTextColor = (backgroundColor: string): string => {
  const hex = backgroundColor.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return '#FFFFFF';

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.65 ? '#1F2937' : '#FFFFFF';
};

const formatReservationDateLabel = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

interface ConfirmDialogState {
  isOpen: boolean;
  reservationId: string;
  reservationName: string;
  customerName: string;
  action: 'CANCELLED' | 'NO_SHOW' | 'CONFIRMED' | 'COMPLETED';
}

interface ReservationsClientProps {
  initialReservations: Reservation[];
  categoryColors: Record<string, string>;
  menuCategoryColors: Record<string, string>;
  staffList: { id: string; name: string; image: string | null }[];
  totalPages: number;
  dateStr: string;
  statusFilter: string;
  staffFilter: string;
  searchQuery: string;
  page: number;
  highlightId: string;
}

export default function ReservationsClient({
  initialReservations,
  categoryColors,
  menuCategoryColors,
  staffList,
  totalPages,
  dateStr,
  statusFilter,
  staffFilter,
  searchQuery: initialSearchQuery,
  page,
  highlightId,
}: ReservationsClientProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    reservationId: '',
    reservationName: '',
    customerName: '',
    action: 'CANCELLED',
  });

  const parsedDate = dateStr ? new Date(dateStr + 'T12:00:00') : null;
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (parsedDate) return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    setReservations(initialReservations);
  }, [initialReservations]);

  useEffect(() => {
    setSearchInput(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    if (!dateStr) return;
    const nextDate = new Date(dateStr + 'T12:00:00');
    setCurrentMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }, [dateStr]);


  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      date: dateStr,
      status: statusFilter,
      staffId: staffFilter,
      search: initialSearchQuery,
      page: String(page),
      ...overrides,
    };
    if (merged.date) params.set('date', merged.date);
    if (merged.status) params.set('status', merged.status);
    if (merged.staffId) params.set('staffId', merged.staffId);
    if (merged.search) params.set('search', merged.search);
    if (merged.page && merged.page !== '1') params.set('page', merged.page);
    const qs = params.toString();
    return qs ? `?${qs}` : '?';
  };

  const handleDateSelect = (date: Date | null) => {
    if (!date) {
      router.push(buildUrl({ date: 'all', page: '1' }));
    } else {
      const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      router.push(buildUrl({ date: ds, page: '1' }));
    }
  };

  const handleStatusFilterChange = (val: string | null) => {
    const s = !val || val === '__all' ? '' : val;
    router.push(buildUrl({ status: s, page: '1' }));
  };

  const handleStaffFilterChange = (val: string | null) => {
    const s = !val || val === '__all' ? '' : val;
    router.push(buildUrl({ staffId: s, page: '1' }));
  };

  const handleSearch = () => {
    router.push(buildUrl({ search: searchInput, page: '1' }));
  };

  const handleGoToday = () => {
    const now = new Date();
    const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    router.push(buildUrl({ date: ds, page: '1' }));
  };

  const generateCalendarDays = (): (Date | null)[] => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    return days;
  };

  const formatDate = (date: Date) =>
    `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`;

  const isSelected = (date: Date) => {
    if (!parsedDate) return false;
    return date.getFullYear() === parsedDate.getFullYear() &&
      date.getMonth() === parsedDate.getMonth() &&
      date.getDate() === parsedDate.getDate();
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const openConfirmDialog = (reservation: Reservation, action: ConfirmDialogState['action']) => {
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
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const actionCfg = ACTION_CONFIG[confirmDialog.action] ?? ACTION_CONFIG.CANCELLED;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="予約管理" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <button
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="lg:hidden w-full flex items-center justify-between mb-2"
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {parsedDate ? formatDate(parsedDate) : 'すべての日付'}
                </span>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isCalendarOpen ? 'rotate-90' : ''}`} />
              </button>

              <div className={`${isCalendarOpen ? 'block' : 'hidden'} lg:block`}>
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
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
                      onClick={() => date && handleDateSelect(date)}
                      disabled={!date}
                      className={`h-9 w-full flex items-center justify-center text-sm rounded-md transition-colors ${
                        !date
                          ? ''
                          : isSelected(date)
                            ? 'bg-primary text-primary-foreground'
                            : isToday(date)
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'hover:bg-accent'
                      }`}
                    >
                      {date?.getDate()}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={handleGoToday}>今日</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => handleDateSelect(null)}>全日付</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reservations List */}
        <div className="lg:col-span-3 min-w-0">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="名前・電話・メールで検索"
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Select value={statusFilter || '__all'} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="h-9 text-sm w-full sm:w-36">
                    <span className="flex-1 text-left truncate">
                      {statusFilter ? (STATUS_OPTIONS.find(o => o.value === statusFilter)?.label ?? statusFilter) : 'すべて'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">すべて</SelectItem>
                    {STATUS_OPTIONS.filter(o => o.value).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={staffFilter || '__all'} onValueChange={handleStaffFilterChange}>
                  <SelectTrigger className="h-9 text-sm w-full sm:w-36">
                    <span className="flex-1 text-left truncate">
                      {staffFilter ? (staffList.find(s => s.id === staffFilter)?.name ?? staffFilter) : 'すべて'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">すべて</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-9" onClick={handleSearch}>
                  <Search className="w-3.5 h-3.5 mr-1.5" />検索
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Date label */}
          {parsedDate && (
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{formatDate(parsedDate)}</span>
            </div>
          )}

          {/* Per-Stylist Lane Timeline */}
          {parsedDate && reservations.filter((r) => r.status !== 'CANCELLED').length > 0 && (
            <Card className="mb-4">
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="px-1 sm:px-2 lg:px-4">
                    {(() => {
                      const active = reservations.filter((r) => r.status !== 'CANCELLED');
                      const staffLanes = new Map<string, { name: string; reservations: Reservation[] }>();
                      const unassigned: Reservation[] = [];
                      for (const r of active) {
                        const sid = r.staffId || r.staff?.id;
                        const sname = r.staffName || r.staff?.name;
                        if (sid && sname) {
                          if (!staffLanes.has(sid)) staffLanes.set(sid, { name: sname, reservations: [] });
                          staffLanes.get(sid)!.reservations.push(r);
                        } else {
                          unassigned.push(r);
                        }
                      }
                      if (unassigned.length > 0) staffLanes.set('__unassigned', { name: '未割当', reservations: unassigned });

                      const lanes = Array.from(staffLanes.entries());
                      const ROW_HEIGHT = 44;

                      return (
                        <div className="flex items-start">
                          <div
                            className="flex-shrink-0 pr-2"
                            style={{ width: `${TIMELINE_LABEL_WIDTH_PX}px` }}
                          >
                            <div className="mb-2 h-7" />
                            {lanes.map(([staffId, lane]) => (
                              <div
                                key={staffId}
                                className="mb-1 flex items-center border-r border-border/60 pr-2"
                                style={{ height: `${ROW_HEIGHT}px` }}
                              >
                                <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate">{lane.name}</span>
                              </div>
                            ))}
                          </div>

                          <div
                            className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden touch-pan-x [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]"
                            style={{ touchAction: 'pan-x' }}
                          >
                            <div className="w-full" style={{ minWidth: `${TIMELINE_AREA_MIN_WIDTH_PX}px` }}>
                              {/* Time labels */}
                              <div className="relative mb-2 h-7">
                                {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
                                  const left = (i / TIMELINE_HOURS) * 100;
                                  const translateClass = i === 0 ? 'translate-x-0' : i === TIMELINE_HOURS ? '-translate-x-full' : '-translate-x-1/2';
                                  return (
                                    <div
                                      key={i}
                                      className={`absolute text-[10px] sm:text-xs text-gray-400 ${translateClass} ${i % 2 !== 0 ? 'hidden sm:block' : ''}`}
                                      style={{ left: `${left}%` }}
                                    >
                                      {TIMELINE_START_HOUR + i}:00
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Staff lanes */}
                              {lanes.map(([staffId, lane]) => (
                                <div key={staffId} className="mb-1">
                                  <div
                                    className="relative bg-gray-50 rounded-lg overflow-hidden"
                                    style={{ height: `${ROW_HEIGHT}px` }}
                                  >
                                    {/* Grid lines */}
                                    <div className="absolute inset-0">
                                      {Array.from({ length: TIMELINE_HOURS * 3 + 1 }, (_, i) => {
                                        const isHourLine = i % 3 === 0;
                                        const left = (i / (TIMELINE_HOURS * 3)) * 100;
                                        return (
                                          <div
                                            key={i}
                                            className={`absolute top-0 bottom-0 ${isHourLine ? 'border-l border-gray-300' : 'border-l border-gray-200/60'}`}
                                            style={{ left: `${left}%` }}
                                          />
                                        );
                                      })}
                                    </div>

                                    {/* Current time indicator */}
                                    {parsedDate.toDateString() === new Date().toDateString() && (() => {
                                      const now = new Date();
                                      const nowMin = now.getHours() * 60 + now.getMinutes();
                                      const startMin = TIMELINE_START_HOUR * 60;
                                      const endMin = TIMELINE_END_HOUR * 60;
                                      if (nowMin >= startMin && nowMin <= endMin) {
                                        const leftPos = ((nowMin - startMin) / TIMELINE_TOTAL_MIN) * 100;
                                        return (
                                          <div className="absolute top-0 bottom-0 z-20" style={{ left: `${leftPos}%` }}>
                                            <div className="h-full border-l-2 border-red-500" />
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {/* Reservation blocks */}
                                    {lane.reservations.map((r) => {
                                      const startMin = timeToMinutes(r.startTime) - TIMELINE_START_HOUR * 60;
                                      const endMin = timeToMinutes(r.endTime) - TIMELINE_START_HOUR * 60;
                                      const left = (startMin / TIMELINE_TOTAL_MIN) * 100;
                                      const width = ((endMin - startMin) / TIMELINE_TOTAL_MIN) * 100;
                                      const isFaded = r.status === 'NO_SHOW';
                                      const isOnline = r.paymentMethod === 'ONLINE';

                                      return (
                                        <div
                                          key={r.id}
                                          className={`absolute top-1 bottom-1 flex rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all cursor-default ${
                                            isFaded ? 'opacity-40' : ''
                                          } ${highlightId === r.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                                          style={{
                                            left: `${left}%`,
                                            width: `${Math.max(width, 3)}%`,
                                          }}
                                          title={`${r.startTime}〜${r.endTime} ${r.menuSummary} - ${r.user.name || '名前未登録'}${isOnline ? ' (Web決済済み)' : ''}`}
                                        >
                                          {r.items.length > 0 ? (
                                            r.items.map((item, idx) => {
                                              const segmentWidth = (item.duration / r.totalDuration) * 100;
                                              return (
                                                <div
                                                  key={item.id}
                                                  className={`h-full flex items-center justify-center ${idx === 0 ? 'rounded-l-md' : ''} ${idx === r.items.length - 1 ? 'rounded-r-md' : ''}`}
                                                  style={{
                                                    backgroundColor: getReservationItemColor(item, menuCategoryColors, categoryColors),
                                                    width: `${segmentWidth}%`,
                                                  }}
                                                >
                                                  {segmentWidth > 25 && (
                                                    <span
                                                      className="text-[10px] font-medium truncate px-1"
                                                      style={{ color: getReadableTextColor(getReservationItemColor(item, menuCategoryColors, categoryColors)) }}
                                                    >
                                                      {item.menuName.split('（')[0]}
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <div className="h-full w-full bg-blue-500 flex items-center px-2">
                                              <span className="text-white text-[10px] font-medium truncate">{r.menuSummary}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* List */}
          <Card>
            <div className="divide-y divide-border">
              {reservations.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  予約がありません
                </div>
              ) : (
                reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className={`p-3 sm:p-4 md:p-5 ${highlightId === reservation.id ? 'bg-blue-50' : ''}`}
                  >
                    {/* Mobile layout */}
                    <div className="sm:hidden space-y-2">
                      {!parsedDate && (
                        <div className="text-xs text-gray-500">
                          {formatReservationDateLabel(reservation.date)}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{reservation.startTime}〜{reservation.endTime}</span>
                          <StatusBadge status={reservation.status} />
                          {reservation.paymentMethod === 'ONLINE' && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0.5">
                              <CreditCard className="w-2.5 h-2.5" />Web済
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium text-amber-600 text-sm">¥{reservation.totalPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-0.5 w-full h-1.5 rounded-full overflow-hidden">
                        {reservation.items.map((item) => (
                          <div key={item.id} className="h-full" style={{ backgroundColor: getReservationItemColor(item, menuCategoryColors, categoryColors), flex: item.duration }} />
                        ))}
                      </div>
                      <div>
                        <p className="font-medium text-sm truncate">{reservation.menuSummary}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                          <span>{reservation.user.name || '名前未登録'}</span>
                          {reservation.user.phone && <span>{reservation.user.phone}</span>}
                          {(reservation.staffName || reservation.staff?.name) && (
                            <span className="text-pink-600">担当: {reservation.staffName || reservation.staff?.name}</span>
                          )}
                        </div>
                        {reservation.coupon && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700">
                            {reservation.coupon.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
                        {reservation.status === 'CONFIRMED' && (
                          <>
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => openConfirmDialog(reservation, 'COMPLETED')}>
                              <Check className="w-3 h-3 mr-1" />完了
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                              onClick={() => openConfirmDialog(reservation, 'CANCELLED')}>
                              <XCircle className="w-3 h-3 mr-1" />取消
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-destructive border-destructive/20 hover:bg-destructive/5"
                              onClick={() => openConfirmDialog(reservation, 'NO_SHOW')}>
                              <Clock className="w-3 h-3 mr-1" />無断
                            </Button>
                          </>
                        )}
                        {(reservation.status === 'CANCELLED' || reservation.status === 'NO_SHOW') && (
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => openConfirmDialog(reservation, 'CONFIRMED')}>
                            復元
                          </Button>
                        )}
                        {reservation.status === 'COMPLETED' && (
                          <Badge variant="secondary" className="flex-1 justify-center text-xs h-7">完了済み</Badge>
                        )}
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:flex items-start gap-3 md:gap-4">
                      <div className="flex-shrink-0 w-20">
                        {!parsedDate && (
                          <p className="text-xs text-gray-500 mb-0.5">{formatReservationDateLabel(reservation.date)}</p>
                        )}
                        <p className="font-medium">{reservation.startTime}</p>
                        <p className="text-xs text-gray-400">~{reservation.endTime}</p>
                      </div>
                      <div className="flex gap-0.5 w-12 flex-shrink-0 mt-1">
                        {reservation.items.map((item) => (
                          <div key={item.id} className="h-5 rounded" style={{ backgroundColor: getReservationItemColor(item, menuCategoryColors, categoryColors), flex: item.duration }} title={item.menuName} />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <StatusBadge status={reservation.status} />
                          {reservation.paymentMethod === 'ONLINE' && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <CreditCard className="w-3 h-3" />Web決済済み
                            </Badge>
                          )}
                          {reservation.coupon && (
                            <Badge variant="outline" className="text-xs text-amber-700 border-amber-200">
                              {reservation.coupon.code}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate">{reservation.menuSummary}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {reservation.user.name || '名前未登録'}
                          {reservation.user.phone && ` / ${reservation.user.phone}`}
                          {reservation.user.email && ` / ${reservation.user.email}`}
                          {(reservation.staffName || reservation.staff?.name) && (
                            <span className="ml-2 text-pink-600">担当: {reservation.staffName || reservation.staff?.name}</span>
                          )}
                        </p>
                        {reservation.note && <p className="text-xs text-gray-400 mt-1">備考: {reservation.note}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-amber-600">¥{reservation.totalPrice.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{reservation.totalDuration}分</p>
                        {reservation.couponDiscount ? <p className="text-xs text-red-500">-¥{reservation.couponDiscount.toLocaleString()}</p> : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {reservation.status === 'CONFIRMED' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="施術完了"
                              onClick={() => openConfirmDialog(reservation, 'COMPLETED')}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" title="キャンセル"
                              onClick={() => openConfirmDialog(reservation, 'CANCELLED')}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="無断キャンセル"
                              onClick={() => openConfirmDialog(reservation, 'NO_SHOW')}>
                              <Clock className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {(reservation.status === 'CANCELLED' || reservation.status === 'NO_SHOW') && (
                          <Button size="sm" variant="outline" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => openConfirmDialog(reservation, 'CONFIRMED')}>
                            復元
                          </Button>
                        )}
                        {reservation.status === 'COMPLETED' && (
                          <Badge variant="secondary" className="text-xs">完了済み</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => router.push(buildUrl({ page: String(Math.max(1, page - 1)) }))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => router.push(buildUrl({ page: String(Math.min(totalPages, page + 1)) }))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, isOpen: open }))}
        title={actionCfg.title}
        description={`${actionCfg.desc}\n${confirmDialog.reservationName}（${confirmDialog.customerName} 様）`}
        confirmLabel={actionCfg.label}
        variant={ACTION_VARIANTS[confirmDialog.action]}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
