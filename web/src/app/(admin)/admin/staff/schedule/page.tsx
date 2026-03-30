'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CalendarDays, ClipboardList, RefreshCcw } from 'lucide-react';
import { formatLocalDate } from '@/lib/date-utils';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Shift = {
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number;
  status: string;
  note?: string | null;
};

type DayOpsRow = {
  staffId: string;
  staffName: string;
  role: string;
  reservationCount: number;
  pendingRequestCount: number;
  leaveBalance: { remaining: number };
  shift: Shift | null;
  attendance?: { actualStartTime: string | null; actualEndTime: string | null; status: string } | null;
  activeBreak?: { id: string } | null;
};

type EditorState = {
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: string;
  note: string;
};

const TIME_OPTIONS: string[] = [];
for (let hour = 8; hour <= 22; hour += 1) {
  TIME_OPTIONS.push(`${String(hour).padStart(2, '0')}:00`);
  if (hour < 22) TIME_OPTIONS.push(`${String(hour).padStart(2, '0')}:30`);
}

function shiftLabel(shift: Shift | null | undefined) {
  if (!shift?.isWorking || !shift.startTime || !shift.endTime) return '休み';
  return `${shift.startTime.slice(0, 5)} - ${shift.endTime.slice(0, 5)}`;
}

function AttendanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    late: { label: '遅刻', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    overtime: { label: '残業', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
    on_break: { label: '休憩中', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
    working: { label: '出勤中', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    completed: { label: '退勤済', cls: 'bg-muted text-muted-foreground' },
  };
  const info = map[status];
  if (!info) return null;
  return (
    <Badge variant="outline" className={info.cls}>{info.label}</Badge>
  );
}

export default function StaffSchedulePage() {
  const { data: session, status } = useSession();
  const canLoad = status === 'authenticated' && session?.user?.role === 'ADMIN';
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [dayOps, setDayOps] = useState<{ summary?: Record<string, number>; rows?: DayOpsRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const loadData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/day-ops?date=${date}`);
      if (res.ok) setDayOps(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!canLoad) return; void loadData(selectedDate); }, [canLoad, loadData, selectedDate]);

  async function act(task: () => Promise<void>, successMsg: string) {
    try {
      setBusy(true);
      await task();
      toast.success(successMsg);
      await loadData(selectedDate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  const summary = dayOps?.summary ?? {};
  const rows = dayOps?.rows ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background outline-none focus:ring-2 focus:ring-ring/50"
        />
        <Link href="/admin/staff/monthly" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <CalendarDays />
          月次シフト
        </Link>
        <Link href="/admin/requests" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <ClipboardList />
          申請承認
        </Link>
        <Button variant="ghost" size="icon-sm" onClick={() => void loadData(selectedDate)} disabled={loading}>
          <RefreshCcw className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} size="sm">
              <CardContent>
                <Skeleton className="h-3 w-14 mb-2" />
                <Skeleton className="h-7 w-10" />
              </CardContent>
            </Card>
          ))
        ) : (
          [
            { label: '予定出勤', value: summary.scheduledCount ?? 0, color: 'text-foreground' },
            { label: '出勤中', value: summary.clockedInCount ?? 0, color: 'text-emerald-600' },
            { label: '休憩中', value: summary.onBreakCount ?? 0, color: 'text-amber-600' },
            { label: '要確認', value: summary.alertCount ?? 0, color: 'text-destructive' },
          ].map(({ label, value, color }) => (
            <Card key={label} size="sm">
              <CardContent>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Staff rows */}
      <div className="space-y-3">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1.5" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-8" />
                ))}
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 w-16" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && rows.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              本日のスタッフ情報がありません
            </CardContent>
          </Card>
        )}

        {!loading && rows.map(row => (
          <Card key={row.staffId}>
            <CardContent className="p-0">
              {/* Staff info bar */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">{row.staffName.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{row.staffName}</p>
                    <p className="text-xs text-muted-foreground">{row.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {row.attendance?.status && (
                    <AttendanceStatusBadge status={row.attendance.status} />
                  )}
                  {row.pendingRequestCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      未処理申請 {row.pendingRequestCount}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Shift details */}
              <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">予定シフト</p>
                  <p className="font-medium text-foreground">{shiftLabel(row.shift)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">実績</p>
                  <p className="text-foreground">
                    {row.attendance?.actualStartTime?.slice(0, 5) || '--:--'}
                    {' / '}
                    {row.attendance?.actualEndTime?.slice(0, 5) || '--:--'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">予約数</p>
                  <p className="text-foreground">{row.reservationCount} 件</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">有休残</p>
                  <p className="text-foreground">{row.leaveBalance.remaining.toFixed(1)} 日</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-4 py-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 border-transparent"
                  onClick={() => void act(async () => {
                    const res = await fetch('/api/admin/attendance/clock', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ staffId: row.staffId, date: selectedDate, action: 'clock_in' }),
                    });
                    if (!res.ok) throw new Error('出勤打刻に失敗しました');
                  }, `${row.staffName} 出勤を記録`)}
                  disabled={busy}
                >
                  出勤
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-500 text-white hover:bg-amber-600 border-transparent"
                  onClick={() => void act(async () => {
                    const res = await fetch('/api/admin/attendance/break', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ staffId: row.staffId, date: selectedDate, action: row.activeBreak ? 'end' : 'start' }),
                    });
                    if (!res.ok) throw new Error('休憩更新に失敗しました');
                  }, row.activeBreak ? `${row.staffName} 休憩終了` : `${row.staffName} 休憩開始`)}
                  disabled={busy}
                >
                  {row.activeBreak ? '休憩終了' : '休憩開始'}
                </Button>
                <Button
                  size="sm"
                  className="bg-foreground text-background hover:bg-foreground/80 border-transparent"
                  onClick={() => void act(async () => {
                    const res = await fetch('/api/admin/attendance/clock', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ staffId: row.staffId, date: selectedDate, action: 'clock_out' }),
                    });
                    if (!res.ok) throw new Error('退勤打刻に失敗しました');
                  }, `${row.staffName} 退勤を記録`)}
                  disabled={busy}
                >
                  退勤
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditor({
                    staffId: row.staffId,
                    staffName: row.staffName,
                    date: selectedDate,
                    startTime: row.shift?.startTime?.slice(0, 5) || '10:00',
                    endTime: row.shift?.endTime?.slice(0, 5) || '19:00',
                    breakMinutes: row.shift?.breakMinutes || 60,
                    status: row.shift?.status || 'scheduled',
                    note: row.shift?.note || '',
                  })}
                >
                  日別修正
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shift edit dialog */}
      <Dialog open={!!editor} onOpenChange={(open: boolean) => !open && setEditor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editor?.staffName}</DialogTitle>
            <p className="text-sm text-muted-foreground">{editor?.date} 日別シフト修正</p>
          </DialogHeader>
          {editor && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ステータス</label>
                <select
                  value={editor.status}
                  onChange={e => setEditor(prev => prev ? { ...prev, status: e.target.value } : prev)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="scheduled">勤務</option>
                  <option value="off">休み</option>
                  <option value="leave">休暇</option>
                  <option value="published">公開済み</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">開始</label>
                  <select
                    value={editor.startTime}
                    onChange={e => setEditor(prev => prev ? { ...prev, startTime: e.target.value } : prev)}
                    className="w-full border border-input rounded-lg px-2.5 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">終了</label>
                  <select
                    value={editor.endTime}
                    onChange={e => setEditor(prev => prev ? { ...prev, endTime: e.target.value } : prev)}
                    className="w-full border border-input rounded-lg px-2.5 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">休憩（分）</label>
                <input
                  type="number"
                  value={editor.breakMinutes}
                  onChange={e => setEditor(prev => prev ? { ...prev, breakMinutes: Number(e.target.value) } : prev)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-ring/50"
                  placeholder="休憩分"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">メモ</label>
                <textarea
                  value={editor.note}
                  onChange={e => setEditor(prev => prev ? { ...prev, note: e.target.value } : prev)}
                  rows={2}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                  placeholder="メモ"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditor(null)}
                >
                  キャンセル
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void act(async () => {
                    const res = await fetch(`/api/admin/staff/${editor.staffId}/schedule-override`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        date: editor.date,
                        startTime: editor.status === 'off' ? null : editor.startTime,
                        endTime: editor.status === 'off' ? null : editor.endTime,
                        breakMinutes: editor.breakMinutes,
                        status: editor.status,
                        note: editor.note,
                      }),
                    });
                    if (!res.ok) throw new Error('日別シフトの保存に失敗しました');
                    setEditor(null);
                  }, '日別シフトを更新しました')}
                  disabled={busy}
                >
                  {busy ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
