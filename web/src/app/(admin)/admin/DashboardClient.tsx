'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  CalendarOff,
  Clock,
  XCircle,
  Scissors,
  Users,
  Menu,
  CreditCard,
  Mail,
  CheckCircle,
  UtensilsCrossed,
} from 'lucide-react';
import { CATEGORY_COLORS, getCategoryTextColor } from '@/constants/menu';
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
  user: { id: string; name: string | null; email: string | null; phone: string | null };
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

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

interface ConfirmDialogState {
  isOpen: boolean;
  reservationId: string;
  reservationName: string;
  customerName: string;
  action: 'CANCELLED' | 'NO_SHOW' | 'CONFIRMED' | 'COMPLETED';
}

const quickLinks = [
  { href: '/admin/reservations', icon: Calendar, label: '予約管理', sub: '予約一覧・編集', color: 'text-blue-600 bg-blue-50' },
  { href: '/admin/menus', icon: UtensilsCrossed, label: 'メニュー管理', sub: 'メニュー・店販商品', color: 'text-amber-600 bg-amber-50' },
  { href: '/admin/staff', icon: Scissors, label: 'スタッフ管理', sub: 'スタイリスト・シフト', color: 'text-pink-600 bg-pink-50' },
  { href: '/admin/customers', icon: Users, label: '顧客管理', sub: '顧客情報', color: 'text-green-600 bg-green-50' },
  { href: '/admin/holidays', icon: CalendarOff, label: '営業管理', sub: '定休日・不定休', color: 'text-red-600 bg-red-50' },
  { href: '/admin/pos', icon: CreditCard, label: '会計・売上', sub: 'POS・レポート', color: 'text-purple-600 bg-purple-50' },
  { href: '/admin/newsletter', icon: Mail, label: 'ニュースレター', sub: 'メール配信', color: 'text-teal-600 bg-teal-50' },
];

const ACTION_CONFIG = {
  CONFIRMED: { label: '予約を復元する', title: '予約を復元', desc: '以下の予約を元に戻しますか？' },
  COMPLETED: { label: '完了にする', title: '施術完了確認', desc: '以下の予約を施術完了にしますか？' },
  CANCELLED: { label: 'キャンセルする', title: 'キャンセル確認', desc: '以下の予約をキャンセルにしますか？' },
  NO_SHOW: { label: '無断キャンセルにする', title: '無断キャンセル確認', desc: '以下の予約を無断キャンセルにしますか？' },
};

export default function DashboardClient({
  initialReservations,
  stats,
  todayHolidays,
  todayLabel,
  todayStr,
}: {
  initialReservations: Reservation[];
  stats: DashboardStats;
  todayHolidays: Holiday[];
  todayLabel: string;
  todayStr: string;
}) {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    reservationId: '',
    reservationName: '',
    customerName: '',
    action: 'CANCELLED',
  });

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
          setReservations((prev) =>
            prev.map((r) => (r.id === reservationId ? { ...r, status: action } : r))
          );
        } else {
          setReservations((prev) => prev.filter((r) => r.id !== reservationId));
        }
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const actionCfg = ACTION_CONFIG[confirmDialog.action];
  const TIMELINE_HOURS = 11;
  const TIMELINE_TOTAL_MIN = TIMELINE_HOURS * 60;
  const LANE_HEIGHT = 44;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-semibold">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              本日の予約
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.todayCount}</p>
            <p className="text-xs text-muted-foreground mt-1">件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              今週の予約
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.weekCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.weekStartStr} ~ {stats.weekEndStr}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-500" />
              Web予約累計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.totalReservations}</p>
            <p className="text-xs text-muted-foreground mt-1">件</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {quickLinks.map(({ href, icon: Icon, label, sub, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm leading-tight truncate">{label}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block truncate">{sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Today's Reservations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">本日のご予約</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {reservations.length}件
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Holiday notice */}
          {todayHolidays.length > 0 && (
            <div className="mx-6 mb-4 rounded-lg bg-red-50 border border-red-100 p-3">
              {todayHolidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center gap-2 text-red-600">
                  <CalendarOff className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium">
                    {!holiday.startTime || !holiday.endTime
                      ? `終日休業${holiday.reason ? `（${holiday.reason}）` : ''}`
                      : `${holiday.startTime}〜${holiday.endTime} 休業${holiday.reason ? `（${holiday.reason}）` : ''}`
                    }
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Timeline (desktop) */}
          <div className="hidden md:block px-6 pb-4">
            {(() => {
              const staffLanes = new Map<string, { name: string; reservations: Reservation[] }>();
              const unassigned: Reservation[] = [];
              for (const r of reservations) {
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
              if (lanes.length === 0 && todayHolidays.length === 0) return null;

              return (
                <div className="mb-4 bg-muted/30 rounded-lg p-3">
                  <div className="relative h-6 mb-1 ml-20">
                    {Array.from({ length: 12 }, (_, i) => {
                      const left = (i / 11) * 100;
                      const translateClass = i === 0 ? 'translate-x-0' : i === 11 ? '-translate-x-full' : '-translate-x-1/2';
                      return (
                        <div key={i} className={`absolute text-xs text-muted-foreground ${translateClass}`} style={{ left: `${left}%` }}>
                          {i + 9}:00
                        </div>
                      );
                    })}
                  </div>

                  {lanes.map(([staffId, lane]) => (
                    <div key={staffId} className="flex items-stretch mb-1">
                      <div className="w-20 shrink-0 flex items-center pr-2">
                        <span className="text-xs font-medium text-muted-foreground truncate">{lane.name}</span>
                      </div>
                      <div className="flex-1 relative bg-background rounded-md overflow-hidden border border-border" style={{ height: `${LANE_HEIGHT}px` }}>
                        <div className="absolute inset-0">
                          {Array.from({ length: 34 }, (_, i) => {
                            const isHourLine = i % 3 === 0;
                            const left = (i / 33) * 100;
                            return (
                              <div key={i} className={`absolute top-0 bottom-0 ${isHourLine ? 'border-l border-border' : 'border-l border-border/40'}`} style={{ left: `${left}%` }} />
                            );
                          })}
                        </div>
                        {todayHolidays.map((holiday) => {
                          if (!holiday.startTime || !holiday.endTime) {
                            return <div key={holiday.id} className="absolute inset-0 bg-red-500/20" title={holiday.reason || '終日休業'} />;
                          }
                          const hStartMin = timeToMinutes(holiday.startTime) - 540;
                          const hEndMin = timeToMinutes(holiday.endTime) - 540;
                          const left = Math.max(0, (hStartMin / TIMELINE_TOTAL_MIN) * 100);
                          const width = Math.min(100 - left, ((hEndMin - hStartMin) / TIMELINE_TOTAL_MIN) * 100);
                          return <div key={holiday.id} className="absolute top-0 bottom-0 bg-red-500/20" style={{ left: `${left}%`, width: `${width}%` }} />;
                        })}
                        {lane.reservations.map((reservation) => {
                          const startMin = timeToMinutes(reservation.startTime) - 540;
                          const endMin = timeToMinutes(reservation.endTime) - 540;
                          const left = (startMin / TIMELINE_TOTAL_MIN) * 100;
                          const width = ((endMin - startMin) / TIMELINE_TOTAL_MIN) * 100;
                          return (
                            <button
                              key={reservation.id}
                              onClick={() => router.push(`/admin/reservations?date=${todayStr}&highlight=${reservation.id}`)}
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

                  {lanes.length === 0 && todayHolidays.length > 0 && (
                    <div className="relative h-14 bg-background rounded-md overflow-hidden border border-border ml-20">
                      {todayHolidays.map((holiday) => {
                        if (!holiday.startTime || !holiday.endTime) {
                          return (
                            <div key={holiday.id} className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
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

          {/* Reservation list */}
          <div className="divide-y divide-border">
            {reservations.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                本日の予約はありません
              </div>
            )}
            {reservations.map((reservation) => (
              <div key={reservation.id} className="px-6 py-3 flex items-center gap-4">
                <div className="w-20 shrink-0">
                  <span className="text-sm font-medium">{reservation.startTime}</span>
                  <span className="text-xs text-muted-foreground ml-1">~{reservation.endTime}</span>
                </div>
                <div className="flex gap-0.5 w-14 shrink-0">
                  {reservation.items.map((item) => (
                    <div
                      key={item.id}
                      className="h-5 rounded"
                      style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#888', flex: item.duration }}
                      title={item.menuName}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{reservation.menuSummary}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {reservation.user.name || '名前未登録'}
                    {reservation.staffName && (
                      <span className="ml-2 text-pink-600">担当: {reservation.staffName}</span>
                    )}
                    <span className="hidden lg:inline">
                      {reservation.user.phone && ` / ${reservation.user.phone}`}
                    </span>
                  </p>
                </div>
                <div className="text-sm font-medium text-amber-600 shrink-0 hidden sm:block">
                  ¥{reservation.totalPrice.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => openConfirmDialog(reservation, 'COMPLETED')}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    完了
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="キャンセル"
                    onClick={() => openConfirmDialog(reservation, 'CANCELLED')}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="無断キャンセル"
                    onClick={() => openConfirmDialog(reservation, 'NO_SHOW')}
                  >
                    <Clock className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, isOpen: open }))}
        title={actionCfg.title}
        description={`${actionCfg.desc}\n${confirmDialog.reservationName}（${confirmDialog.customerName} 様）`}
        confirmLabel={actionCfg.label}
        variant={confirmDialog.action === 'CANCELLED' || confirmDialog.action === 'NO_SHOW' ? 'destructive' : 'default'}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
