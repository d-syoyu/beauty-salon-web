'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  CalendarOff,
  CheckCircle,
  Clock,
  CreditCard,
  Megaphone,
  Scissors,
  Users,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { getCategoryTextColor } from '@/constants/menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

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
  status: string;
  staffId: string | null;
  staffName: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  staff?: { id: string; name: string; image: string | null } | null;
  items: ReservationItem[];
}

export interface DashboardStats {
  todayCount: number;
  weekCount: number;
  totalReservations: number;
  weekStartStr: string;
  weekEndStr: string;
}

export interface Holiday {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

type ReservationStatusAction = 'CANCELLED' | 'NO_SHOW' | 'CONFIRMED' | 'COMPLETED';

interface ConfirmDialogState {
  isOpen: boolean;
  reservationId: string;
  reservationName: string;
  customerName: string;
  action: ReservationStatusAction;
}

const quickLinks = [
  { href: '/admin/reservations', icon: Calendar, label: '予約', sub: '予約台帳', color: 'bg-blue-50 text-blue-600' },
  { href: '/admin/menus', icon: UtensilsCrossed, label: 'メニュー', sub: 'メニューとカテゴリ', color: 'bg-amber-50 text-amber-600' },
  { href: '/admin/staff', icon: Scissors, label: 'スタッフ', sub: '勤怠とシフト', color: 'bg-pink-50 text-pink-600' },
  { href: '/admin/customers', icon: Users, label: '顧客', sub: '顧客情報と履歴', color: 'bg-emerald-50 text-emerald-600' },
  { href: '/admin/holidays', icon: CalendarOff, label: '休業日', sub: '店休日と特別営業日', color: 'bg-red-50 text-red-600' },
  { href: '/admin/pos', icon: CreditCard, label: 'POS', sub: '売上とレポート', color: 'bg-violet-50 text-violet-600' },
  { href: '/admin/campaigns', icon: Megaphone, label: 'キャンペーン', sub: 'お知らせと配信', color: 'bg-teal-50 text-teal-600' },
];

const ACTION_CONFIG: Record<ReservationStatusAction, { label: string; title: string; desc: string }> = {
  CONFIRMED: { label: '確定に戻す', title: '予約を確定に戻す', desc: 'この予約を確定ステータスに戻します。' },
  COMPLETED: { label: '来店済みにする', title: '予約を来店済みにする', desc: 'この予約を来店済みに変更します。' },
  CANCELLED: { label: '予約をキャンセル', title: '予約をキャンセル', desc: 'この予約をキャンセル扱いにします。' },
  NO_SHOW: { label: '無断キャンセルにする', title: '無断キャンセルにする', desc: 'この予約を無断キャンセル扱いにします。' },
};

const ACTION_VARIANTS = {
  CONFIRMED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'warning',
  NO_SHOW: 'destructive',
} as const;

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatMoney(value: number) {
  return `¥${value.toLocaleString()}`;
}

export default function DashboardClient({
  initialReservations,
  stats,
  todayHolidays,
  todayLabel,
  todayStr,
  categoryColors,
}: {
  initialReservations: Reservation[];
  stats: DashboardStats;
  todayHolidays: Holiday[];
  todayLabel: string;
  todayStr: string;
  categoryColors: Record<string, string>;
}) {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(['CONFIRMED', 'COMPLETED']));
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    reservationId: '',
    reservationName: '',
    customerName: '',
    action: 'CANCELLED',
  });
  const [nowMin, setNowMin] = useState(() => {
    const current = new Date();
    return current.getHours() * 60 + current.getMinutes() - 540;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const current = new Date();
      setNowMin(current.getHours() * 60 + current.getMinutes() - 540);
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const visibleReservations = reservations.filter((reservation) => statusFilter.has(reservation.status));
  const actionCfg = ACTION_CONFIG[confirmDialog.action];
  const timelineTotalMin = 11 * 60;
  const laneHeight = 44;
  const nowLineLeft = (nowMin / timelineTotalMin) * 100;
  const showNowLine = nowMin >= 0 && nowMin <= timelineTotalMin;

  const openConfirmDialog = (reservation: Reservation, action: ReservationStatusAction) => {
    setConfirmDialog({
      isOpen: true,
      reservationId: reservation.id,
      reservationName: reservation.menuSummary,
      customerName: reservation.user.name || 'ゲスト',
      action,
    });
  };

  const handleStatusChange = async () => {
    const { reservationId, action } = confirmDialog;

    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });

      if (response.ok) {
        setReservations((current) =>
          current.map((item) => (item.id === reservationId ? { ...item, status: action } : item)),
        );
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to update reservation status', error);
    } finally {
      setConfirmDialog((current) => ({ ...current, isOpen: false }));
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">ダッシュボード</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4 text-blue-500" />
              本日
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.todayCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">件の予約</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-indigo-500" />
              今週
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.weekCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.weekStartStr} - {stats.weekEndStr}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Scissors className="h-4 w-4 text-amber-500" />
              合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.totalReservations}</p>
            <p className="mt-1 text-xs text-muted-foreground">有効な予約</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {quickLinks.map(({ href, icon: Icon, label, sub, color }) => (
          <Link key={href} href={href}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className={`shrink-0 rounded-lg p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium leading-tight sm:text-sm">{label}</p>
                  <p className="hidden truncate text-xs text-muted-foreground sm:block">{sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">本日のタイムライン</CardTitle>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {([
                ['CONFIRMED', '確定', 'bg-blue-100 border-blue-300 text-blue-700'],
                ['COMPLETED', '来店済み', 'bg-emerald-100 border-emerald-300 text-emerald-700'],
                ['CANCELLED', 'キャンセル', 'bg-orange-100 border-orange-300 text-orange-700'],
                ['NO_SHOW', '無断キャンセル', 'bg-red-100 border-red-300 text-red-700'],
              ] as const).map(([status, label, activeClass]) => {
                const active = statusFilter.has(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter((current) => {
                        const next = new Set(current);
                        if (next.has(status)) next.delete(status);
                        else next.add(status);
                        return next;
                      });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      active ? activeClass : 'border-border bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <Badge variant="secondary" className="text-xs">
                {visibleReservations.length}件表示
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {todayHolidays.length > 0 ? (
            <div className="mx-6 mb-4 rounded-lg border border-red-100 bg-red-50 p-3">
              {todayHolidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center gap-2 text-red-600">
                  <CalendarOff className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-medium">
                    {holiday.startTime && holiday.endTime
                      ? `${holiday.startTime} - ${holiday.endTime}`
                      : 'Closed all day'}
                    {holiday.reason ? ` · ${holiday.reason}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="hidden px-6 pb-4 md:block">
            {(() => {
              const staffLanes = new Map<string, { name: string; reservations: Reservation[] }>();
              const unassigned: Reservation[] = [];

              for (const reservation of visibleReservations) {
                const staffId = reservation.staffId || reservation.staff?.id;
                const staffName = reservation.staffName || reservation.staff?.name;

                if (staffId && staffName) {
                  if (!staffLanes.has(staffId)) {
                    staffLanes.set(staffId, { name: staffName, reservations: [] });
                  }
                  staffLanes.get(staffId)!.reservations.push(reservation);
                } else {
                  unassigned.push(reservation);
                }
              }

              if (unassigned.length > 0) {
                staffLanes.set('__unassigned', { name: '未割当', reservations: unassigned });
              }

              const lanes = Array.from(staffLanes.entries());
              if (lanes.length === 0 && todayHolidays.length === 0) return null;

              return (
                <div className="mb-4 rounded-lg bg-muted/30 p-3">
                  <div className="relative mb-1 ml-20 h-6">
                    {Array.from({ length: 12 }, (_, index) => {
                      const left = (index / 11) * 100;
                      const translateClass =
                        index === 0 ? 'translate-x-0' : index === 11 ? '-translate-x-full' : '-translate-x-1/2';
                      return (
                        <div
                          key={index}
                          className={`absolute text-xs text-muted-foreground ${translateClass}`}
                          style={{ left: `${left}%` }}
                        >
                          {index + 9}:00
                        </div>
                      );
                    })}
                  </div>

                  {lanes.map(([staffId, lane]) => (
                    <div key={staffId} className="mb-1 flex items-stretch">
                      <div className="flex w-20 shrink-0 items-center pr-2">
                        <span className="truncate text-xs font-medium text-muted-foreground">
                          {lane.name}
                        </span>
                      </div>
                      <div
                        className="relative flex-1 overflow-hidden rounded-md border border-border bg-background"
                        style={{ height: `${laneHeight}px` }}
                      >
                        <div className="absolute inset-0">
                          {Array.from({ length: 34 }, (_, index) => {
                            const isHourLine = index % 3 === 0;
                            const left = (index / 33) * 100;
                            return (
                              <div
                                key={index}
                                className={`absolute top-0 bottom-0 ${isHourLine ? 'border-l border-border' : 'border-l border-border/40'}`}
                                style={{ left: `${left}%` }}
                              />
                            );
                          })}
                        </div>

                        {todayHolidays.map((holiday) => {
                          if (!holiday.startTime || !holiday.endTime) {
                            return (
                              <div
                                key={holiday.id}
                                className="absolute inset-0 bg-red-500/20"
                                title={holiday.reason || '休業'}
                              />
                            );
                          }

                          const holidayStart = timeToMinutes(holiday.startTime) - 540;
                          const holidayEnd = timeToMinutes(holiday.endTime) - 540;
                          const left = Math.max(0, (holidayStart / timelineTotalMin) * 100);
                          const width = Math.min(100 - left, ((holidayEnd - holidayStart) / timelineTotalMin) * 100);

                          return (
                            <div
                              key={holiday.id}
                              className="absolute top-0 bottom-0 bg-red-500/20"
                              style={{ left: `${left}%`, width: `${width}%` }}
                            />
                          );
                        })}

                        {showNowLine ? (
                          <div
                            className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-500"
                            style={{ left: `${nowLineLeft}%` }}
                          />
                        ) : null}

                        {lane.reservations.map((reservation) => {
                          const startMin = timeToMinutes(reservation.startTime) - 540;
                          const endMin = timeToMinutes(reservation.endTime) - 540;
                          const left = (startMin / timelineTotalMin) * 100;
                          const width = ((endMin - startMin) / timelineTotalMin) * 100;

                          return (
                            <button
                              key={reservation.id}
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/admin/reservations?date=${todayStr}&highlight=${reservation.id}`,
                                )
                              }
                              className={`absolute top-1 bottom-1 flex cursor-pointer overflow-hidden rounded-md shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-100 ${
                                ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(reservation.status)
                                  ? 'opacity-40'
                                  : ''
                              }`}
                              style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                              title={`${reservation.startTime} - ${reservation.endTime} ${reservation.menuSummary}`}
                            >
                              {reservation.items.length > 0 ? (
                                reservation.items.map((item, index) => {
                                  const segmentWidth = (item.duration / reservation.totalDuration) * 100;
                                  return (
                                    <div
                                      key={item.id}
                                      className={`flex h-full items-center justify-center ${index === 0 ? 'rounded-l-md' : ''} ${index === reservation.items.length - 1 ? 'rounded-r-md' : ''}`}
                                      style={{
                                        backgroundColor: categoryColors[item.category] || '#888',
                                        width: `${segmentWidth}%`,
                                      }}
                                    >
                                      {segmentWidth > 20 ? (
                                        <span
                                          className="truncate px-1 text-xs font-medium"
                                          style={{ color: getCategoryTextColor(item.category) }}
                                        >
                                          {item.menuName}
                                        </span>
                                      ) : null}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="flex h-full w-full items-center bg-blue-500 px-2">
                                  <span className="truncate text-xs font-medium text-white">
                                    {reservation.menuSummary}
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="divide-y divide-border">
            {visibleReservations.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                該当する予約はありません。
              </div>
            ) : null}

            {visibleReservations.map((reservation) => (
              <div key={reservation.id} className="px-4 py-3 sm:px-6">
                <div className="sm:hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-20 shrink-0">
                      <span className="text-sm font-medium">{reservation.startTime}</span>
                      <span className="ml-1 text-xs text-muted-foreground">~{reservation.endTime}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 gap-0.5">
                      {reservation.items.map((item) => (
                        <div
                          key={item.id}
                          className="h-5 rounded"
                          style={{ backgroundColor: categoryColors[item.category] || '#888', flex: item.duration }}
                          title={item.menuName}
                        />
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {reservation.status === 'COMPLETED' ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          来店済み
                        </span>
                      ) : reservation.status === 'CANCELLED' ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
                          <XCircle className="h-3.5 w-3.5" />
                          キャンセル
                        </span>
                      ) : reservation.status === 'NO_SHOW' ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                          <Clock className="h-3.5 w-3.5" />
                          無断キャンセル
                        </span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-emerald-200 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                            onClick={() => openConfirmDialog(reservation, 'COMPLETED')}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="予約をキャンセル"
                            onClick={() => openConfirmDialog(reservation, 'CANCELLED')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="無断キャンセルにする"
                            onClick={() => openConfirmDialog(reservation, 'NO_SHOW')}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p className="truncate text-sm font-medium">{reservation.menuSummary}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {reservation.user.name || 'ゲスト'}
                      {reservation.staffName ? (
                        <span className="ml-2 text-pink-600">担当: {reservation.staffName}</span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="hidden items-center gap-4 sm:flex">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="w-20 shrink-0">
                      <span className="text-sm font-medium">{reservation.startTime}</span>
                      <span className="ml-1 text-xs text-muted-foreground">~{reservation.endTime}</span>
                    </div>
                    <div className="flex w-14 shrink-0 gap-0.5">
                      {reservation.items.map((item) => (
                        <div
                          key={item.id}
                          className="h-5 rounded"
                          style={{ backgroundColor: categoryColors[item.category] || '#888', flex: item.duration }}
                          title={item.menuName}
                        />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{reservation.menuSummary}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {reservation.user.name || 'ゲスト'}
                        {reservation.staffName ? (
                          <span className="ml-2 text-pink-600">担当: {reservation.staffName}</span>
                        ) : null}
                        {reservation.user.phone ? (
                          <span className="hidden lg:inline">{` / ${reservation.user.phone}`}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-sm font-medium text-amber-600 sm:block">
                      {formatMoney(reservation.totalPrice)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {reservation.status === 'COMPLETED' ? (
                      <span className="flex items-center gap-1 px-2 text-xs font-medium text-emerald-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        来店済み
                      </span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-emerald-200 text-xs text-emerald-600 hover:bg-emerald-50"
                          onClick={() => openConfirmDialog(reservation, 'COMPLETED')}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          来店済みにする
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="予約をキャンセル"
                          onClick={() => openConfirmDialog(reservation, 'CANCELLED')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="無断キャンセルにする"
                          onClick={() => openConfirmDialog(reservation, 'NO_SHOW')}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog((current) => ({ ...current, isOpen: open }))}
        title={actionCfg.title}
        description={`${actionCfg.desc}\n${confirmDialog.reservationName} · ${confirmDialog.customerName}`}
        confirmLabel={actionCfg.label}
        variant={ACTION_VARIANTS[confirmDialog.action]}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
