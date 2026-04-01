'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Download, RefreshCcw, Send, Settings } from 'lucide-react';
import { CATEGORY_COLORS } from '@/constants/menu';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShiftSegment = { startTime: string; endTime: string };

type Shift = {
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  segments?: ShiftSegment[];
  breakMinutes: number;
  status: string;
  note?: string | null;
  source?: string;
};

type ShiftPattern = {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
};

type MonthlyShiftEntry = {
  date: string;
  shift: Shift | null;
  attendance: unknown;
};

type StaffRow = {
  id: string;
  name: string;
  role: string;
  shiftPatterns: ShiftPattern[];
  monthlyShifts: MonthlyShiftEntry[];
};

type ActiveCell = {
  staffId: string;
  staffName: string;
  date: string;
  shift: Shift | null;
  patterns: ShiftPattern[];
  anchorRect: DOMRect;
};

type DayReservation = {
  id: string;
  staffId: string | null;
  startTime: string;
  endTime: string;
  user?: { name: string } | null;
  items?: Array<{ category: string; menuName: string }>;
};

// ─── Time options (for shift edit overlay) ────────────────────────────────────

const TIME_OPTIONS: string[] = [];
for (let hour = 7; hour <= 23; hour += 1) {
  for (let min = 0; min < 60; min += 10) {
    if (hour === 23 && min > 0) break;
    TIME_OPTIONS.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
}

// ─── Timeline constants ───────────────────────────────────────────────────────

const TLINE_START_MIN = 8 * 60;  // 8:00 = 480
const TLINE_END_MIN   = 21 * 60; // 21:00 = 1260
const TLINE_TOTAL_MIN = TLINE_END_MIN - TLINE_START_MIN; // 780
const TLINE_HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8–21

function timeStrToMin(t: string): number {
  if (!t) return 0;
  if (t.includes('T')) {
    const d = new Date(t);
    return d.getHours() * 60 + d.getMinutes();
  }
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minToTimeStr(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function toPercent(min: number): number {
  return Math.max(0, Math.min(100, ((min - TLINE_START_MIN) / TLINE_TOTAL_MIN) * 100));
}

// ─── Segment merge / subtract helpers ────────────────────────────────────────

function subtractRange(
  segs: { startTime: string; endTime: string }[],
  eraseStart: number,
  eraseEnd: number,
): { startTime: string; endTime: string }[] {
  const result: { startTime: string; endTime: string }[] = [];
  for (const seg of segs) {
    const s = timeStrToMin(seg.startTime);
    const e = timeStrToMin(seg.endTime);
    if (eraseEnd <= s || eraseStart >= e) {
      result.push(seg); // 重複なし: そのまま
    } else {
      if (s < eraseStart) result.push({ startTime: minToTimeStr(s), endTime: minToTimeStr(eraseStart) });
      if (e > eraseEnd)   result.push({ startTime: minToTimeStr(eraseEnd), endTime: minToTimeStr(e) });
    }
  }
  return result;
}

function mergeSegments(
  segs: { startTime: string; endTime: string }[],
): { startTime: string; endTime: string }[] {
  if (segs.length === 0) return [];
  const sorted = [...segs].sort((a, b) => timeStrToMin(a.startTime) - timeStrToMin(b.startTime));
  const result: { startTime: string; endTime: string }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    const curr = sorted[i];
    if (timeStrToMin(curr.startTime) <= timeStrToMin(last.endTime)) {
      result[result.length - 1] = {
        startTime: last.startTime,
        endTime: minToTimeStr(Math.max(timeStrToMin(last.endTime), timeStrToMin(curr.endTime))),
      };
    } else {
      result.push(curr);
    }
  }
  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function getDaysInMonth(year: number, month: number): Date[] {
  const result: Date[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d++) {
    result.push(new Date(year, month - 1, d));
  }
  return result;
}

function toYYYYMM(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function fromYYYYMM(str: string): { year: number; month: number } {
  const [y, m] = str.split('-').map(Number);
  return { year: y, month: m };
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCellDisplay(shift: Shift | null): { bg: string; text: string; lines: string[] } {
  if (!shift || !shift.isWorking) {
    if (shift?.status === 'leave') {
      return { bg: 'bg-yellow-50', text: 'text-yellow-700 font-semibold', lines: ['休'] };
    }
    return { bg: 'bg-gray-50', text: 'text-gray-300', lines: ['—'] };
  }
  const segs = shift.segments && shift.segments.length >= 2 ? shift.segments : null;
  if (segs) {
    const first = segs[0].startTime.slice(0, 5);
    const extra = segs.length - 1;
    return {
      bg: shift.status === 'published' ? 'bg-emerald-50' : 'bg-green-50',
      text: 'text-green-800 text-[11px] leading-tight font-medium',
      lines: [first, `+${extra}`],
    };
  }
  const start = shift.startTime?.slice(0, 5) ?? '';
  const end = shift.endTime?.slice(0, 5) ?? '';
  return {
    bg: shift.status === 'published' ? 'bg-emerald-50' : 'bg-green-50',
    text: 'text-green-800 text-[11px] leading-tight font-medium',
    lines: [start, end],
  };
}

function getWeekdayColor(date: Date): string {
  const d = date.getDay();
  if (d === 0) return 'text-red-500 font-semibold';
  if (d === 6) return 'text-blue-500 font-semibold';
  return 'text-gray-600';
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonthlyShiftPage() {
  const { data: session, status } = useSession();
  const canLoad = status === 'authenticated' && session?.user?.role === 'ADMIN';
  const today = new Date();
  const [yyyymm, setYyyymm] = useState(toYYYYMM(today.getFullYear(), today.getMonth() + 1));
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [localOverrides, setLocalOverrides] = useState<Map<string, Shift>>(new Map());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Day timeline panel
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayReservations, setDayReservations] = useState<DayReservation[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  // Pattern manager
  const [patternManagerOpen, setPatternManagerOpen] = useState(false);

  // Publish confirmation
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  const { year, month } = fromYYYYMM(yyyymm);
  const days = getDaysInMonth(year, month);

  const load = useCallback(async () => {
    setLoading(true);
    setLocalOverrides(new Map());
    try {
      const res = await fetch(`/api/admin/staff/schedule-overview?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { if (!canLoad) return; load(); }, [canLoad, load]);

  function getShift(staffId: string, date: string, serverShift: Shift | null): Shift | null {
    return localOverrides.get(`${staffId}__${date}`) ?? serverShift;
  }

  function handleCellClick(
    e: React.MouseEvent<HTMLButtonElement>,
    staffId: string,
    staffName: string,
    date: string,
    shift: Shift | null,
    patterns: ShiftPattern[]
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveCell({ staffId, staffName, date, shift, patterns, anchorRect: rect });
  }

  async function handleDayClick(dateStr: string) {
    if (selectedDay === dateStr) {
      setSelectedDay(null);
      return;
    }
    setSelectedDay(dateStr);
    setDayLoading(true);
    setDayReservations([]);
    try {
      const res = await fetch(`/api/admin/reservations?date=${dateStr}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setDayReservations(data.reservations ?? []);
      }
    } finally {
      setDayLoading(false);
    }
  }

  async function handleDragSave(staffId: string, date: string, segs: { startTime: string; endTime: string }[]) {
    const key = `${staffId}__${date}`;
    const existing = localOverrides.get(key) ??
      staff.find(s => s.id === staffId)?.monthlyShifts.find(m => m.date === date)?.shift;

    // 全セグメント削除 → OFF に変更
    if (segs.length === 0) {
      const offShift: Shift = { isWorking: false, startTime: null, endTime: null, breakMinutes: 0, status: 'off', source: 'manual' };
      setLocalOverrides(prev => new Map(prev).set(key, offShift));
      fetch(`/api/admin/staff/${staffId}/schedule-override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, status: 'off', source: 'manual' }),
      });
      return;
    }

    const startTime = segs[0].startTime;
    const endTime = segs[segs.length - 1].endTime;
    const newShift: Shift = {
      isWorking: true,
      startTime,
      endTime,
      segments: segs.length >= 2 ? segs : undefined,
      breakMinutes: existing?.breakMinutes ?? 60,
      status: 'scheduled',
      source: 'manual',
    };
    setLocalOverrides(prev => new Map(prev).set(key, newShift));
    fetch(`/api/admin/staff/${staffId}/schedule-override`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, startTime, endTime,
        segments: segs.length >= 2 ? segs : undefined,
        breakMinutes: newShift.breakMinutes, status: 'scheduled', source: 'manual',
      }),
    });
  }

  async function handlePublishWeek() {
    const weekStart = formatDate(days[0]);
    setPublishing(true);
    try {
      await fetch('/api/admin/staff/schedule-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_week', weekStart }),
      });
      await load();
    } finally {
      setPublishing(false);
    }
  }

  function onSaveCell(staffId: string, date: string, newShift: Shift) {
    const key = `${staffId}__${date}`;
    setLocalOverrides(prev => new Map(prev).set(key, newShift));
    setActiveCell(null);
  }

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setYyyymm(toYYYYMM(d.getFullYear(), d.getMonth() + 1));
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setYyyymm(toYYYYMM(d.getFullYear(), d.getMonth() + 1));
  };

  const csvUrl = `/api/admin/staff/schedule-overview?year=${year}&month=${month}&format=csv`;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Toolbar: month nav + legend + actions (single row) */}
      <div className="flex-shrink-0 bg-background border-b border-border px-3 py-1.5 flex items-center gap-1.5">
        <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
          <ChevronLeft />
        </Button>
        <input
          type="month"
          value={yyyymm}
          onChange={e => setYyyymm(e.target.value)}
          className="text-sm font-semibold text-foreground bg-transparent border-none outline-none cursor-pointer"
        />
        <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
          <ChevronRight />
        </Button>
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground ml-2">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-100 inline-block" /> 勤務</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 inline-block" /> 公開済</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-100 inline-block" /> 休暇</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon-sm" onClick={() => setPatternManagerOpen(true)} title="シフトパターン管理">
            <Settings />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={load} disabled={loading} title="更新">
            <RefreshCcw className={loading ? 'animate-spin' : ''} />
          </Button>
          <a href={csvUrl} download className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Download />
            <span className="hidden sm:inline">CSV</span>
          </a>
          <Button size="sm" onClick={() => setPublishConfirmOpen(true)} disabled={publishing}>
            <Send />
            <span className="hidden sm:inline">公開</span>
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className={`flex-1 overflow-auto bg-muted/20 ${selectedDay ? 'pb-72' : ''}`}>
        {loading ? (
          <div className="p-4 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40 flex-shrink-0" />
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 flex-1" />)}
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-14 w-40 flex-shrink-0" />
                {Array.from({ length: 10 }).map((_, j) => <Skeleton key={j} className="h-14 flex-1" />)}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="relative"
            style={{
              display: 'grid',
              gridTemplateColumns: `120px repeat(${days.length}, minmax(44px, 1fr))`,
              minWidth: `${120 + days.length * 44}px`,
            }}
          >
            {/* Top-left corner */}
            <div className="sticky left-0 top-0 z-30 bg-white border-b-2 border-r border-gray-200 flex items-center px-3 py-2">
              <span className="text-xs font-medium text-gray-500">スタッフ</span>
            </div>

            {/* Day headers — click to show timeline */}
            {days.map(date => {
              const dateStr = formatDate(date);
              const isT = isToday(date);
              const isSelected = selectedDay === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={`sticky top-0 z-10 border-b-2 border-r border-gray-100 text-center py-2.5 transition-colors ${
                    isSelected
                      ? 'bg-indigo-500 border-indigo-500'
                      : isT
                      ? 'bg-indigo-50 hover:bg-indigo-100'
                      : 'bg-gray-50 hover:bg-indigo-50'
                  }`}
                >
                  <div className={`text-xs font-semibold ${isSelected ? 'text-white' : isT ? 'text-indigo-600' : 'text-gray-800'}`}>
                    {date.getDate()}
                  </div>
                  <div className={`text-[10px] ${isSelected ? 'text-indigo-100' : getWeekdayColor(date)}`}>
                    {WEEKDAY_LABELS[date.getDay()]}
                  </div>
                </button>
              );
            })}

            {/* Staff rows */}
            {staff.map((member, rowIdx) => (
              <React.Fragment key={member.id}>
                {/* Staff label */}
                <div
                  className={`sticky left-0 z-20 border-b border-r border-gray-100 bg-white px-3 py-2 ${
                    rowIdx % 2 === 1 ? 'bg-gray-50/60' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{member.role}</p>
                </div>

                {/* Shift cells */}
                {member.monthlyShifts.map(({ date, shift: serverShift }) => {
                  const shift = getShift(member.id, date, serverShift);
                  const { bg, text, lines } = getCellDisplay(shift);
                  const dateObj = new Date(date + 'T12:00:00');
                  const isT = isToday(dateObj);
                  const isSun = dateObj.getDay() === 0;
                  const isSat = dateObj.getDay() === 6;
                  const isSelected = selectedDay === date;

                  return (
                    <button
                      key={`${member.id}-${date}`}
                      onClick={e => handleCellClick(e, member.id, member.name, date, shift, member.shiftPatterns)}
                      className={`
                        border-b border-r flex flex-col items-center justify-center
                        min-h-[52px] cursor-pointer transition-opacity hover:opacity-75 active:opacity-50
                        ${bg}
                        ${isT ? 'ring-1 ring-inset ring-indigo-300' : ''}
                        ${isSelected ? 'ring-1 ring-inset ring-indigo-400 bg-indigo-50/30' : ''}
                        ${isSun ? 'bg-red-50/40' : isSat ? 'bg-blue-50/40' : ''}
                      `}
                    >
                      {lines.map((line, i) => (
                        <span key={i} className={text}>{line}</span>
                      ))}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Cell edit popover / bottom sheet */}
      {activeCell && (
        <ShiftEditOverlay
          cell={activeCell}
          onClose={() => setActiveCell(null)}
          onSave={onSaveCell}
          panelOpen={!!selectedDay}
        />
      )}

      {/* Day timeline panel */}
      {selectedDay && (
        <DayTimelinePanel
          date={selectedDay}
          staff={staff}
          localOverrides={localOverrides}
          reservations={dayReservations}
          loading={dayLoading}
          onClose={() => setSelectedDay(null)}
          onDragSave={handleDragSave}
        />
      )}

      {/* Pattern manager modal */}
      {patternManagerOpen && (
        <PatternManagerModal
          staff={staff}
          onClose={() => setPatternManagerOpen(false)}
          onChanged={load}
        />
      )}

      {/* Publish confirmation */}
      <ConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title="シフトを公開しますか？"
        description="現在の月のシフトをスタッフに公開します。公開後もシフトの修正は可能です。"
        confirmLabel="公開する"
        cancelLabel="キャンセル"
        variant="default"
        onConfirm={() => {
          setPublishConfirmOpen(false);
          void handlePublishWeek();
        }}
      />
    </div>
  );
}

// ─── Shift Edit Overlay ───────────────────────────────────────────────────────

function ShiftEditOverlay({
  cell,
  onClose,
  onSave,
  panelOpen = false,
}: {
  cell: ActiveCell;
  onClose: () => void;
  onSave: (staffId: string, date: string, shift: Shift) => void;
  panelOpen?: boolean;
}) {
  const [mode, setMode] = useState<'work' | 'off' | 'leave'>(
    !cell.shift || !cell.shift.isWorking
      ? (cell.shift?.status === 'leave' ? 'leave' : 'off')
      : 'work'
  );

  const initSegments = (): ShiftSegment[] => {
    if (cell.shift?.segments && cell.shift.segments.length >= 2) return cell.shift.segments;
    return [{ startTime: cell.shift?.startTime?.slice(0, 5) ?? '10:00', endTime: cell.shift?.endTime?.slice(0, 5) ?? '19:00' }];
  };

  const [segments, setSegments] = useState<ShiftSegment[]>(initSegments);
  const [breakMin, setBreakMin] = useState(String(cell.shift?.breakMinutes ?? 60));
  const [saving, setSaving] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const dateObj = new Date(cell.date + 'T12:00:00');
  const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}(${['日','月','火','水','木','金','土'][dateObj.getDay()]})`;

  function applyPattern(p: ShiftPattern) {
    setMode('work');
    setSegments([{ startTime: p.startTime.slice(0, 5), endTime: p.endTime.slice(0, 5) }]);
    setBreakMin(String(p.breakMinutes));
  }

  function addSegment() {
    const last = segments[segments.length - 1];
    const lastEndHour = parseInt(last.endTime.split(':')[0], 10);
    const newStart = `${String(Math.min(lastEndHour + 1, 22)).padStart(2, '0')}:00`;
    const newEnd = `${String(Math.min(lastEndHour + 3, 23)).padStart(2, '0')}:00`;
    setSegments(prev => [...prev, { startTime: newStart, endTime: newEnd }]);
  }

  function removeSegment(idx: number) {
    setSegments(prev => prev.filter((_, i) => i !== idx));
  }

  function updateSegment(idx: number, field: 'startTime' | 'endTime', value: string) {
    setSegments(prev => prev.map((seg, i) => i === idx ? { ...seg, [field]: value } : seg));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let body: Record<string, unknown>;
      if (mode === 'work') {
        const useSegments = segments.length >= 2 ? segments : null;
        body = {
          date: cell.date,
          segments: useSegments,
          startTime: segments[0].startTime,
          endTime: segments[0].endTime,
          breakMinutes: Number(breakMin),
          status: 'scheduled',
          source: 'manual',
        };
      } else if (mode === 'leave') {
        body = { date: cell.date, startTime: null, endTime: null, breakMinutes: 0, status: 'leave', source: 'manual' };
      } else {
        body = { date: cell.date, startTime: null, endTime: null, breakMinutes: 0, status: 'off', source: 'manual' };
      }

      const res = await fetch(`/api/admin/staff/${cell.staffId}/schedule-override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const useSegments = mode === 'work' && segments.length >= 2 ? segments : undefined;
        const newShift: Shift = {
          isWorking: mode === 'work',
          startTime: mode === 'work' ? segments[0].startTime : null,
          endTime: mode === 'work' ? segments[segments.length - 1].endTime : null,
          segments: useSegments,
          breakMinutes: mode === 'work' ? Number(breakMin) : 0,
          status: mode === 'work' ? 'scheduled' : mode === 'leave' ? 'leave' : 'off',
          source: 'manual',
        };
        onSave(cell.staffId, cell.date, newShift);
        toast.success('シフトを保存しました');
      } else {
        toast.error('保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  }

  const overlayContent = (
    <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 ${isMobile ? 'w-full rounded-b-none' : ''} flex flex-col`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-500">{cell.staffName}</p>
          <p className="text-sm font-semibold text-gray-900">{dateLabel}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(['work', 'off', 'leave'] as const).map((m, i) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 font-medium transition-colors ${
                mode === m
                  ? m === 'work' ? 'bg-green-500 text-white' : m === 'leave' ? 'bg-yellow-400 text-white' : 'bg-gray-400 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              } ${i > 0 ? 'border-l border-gray-200' : ''}`}
            >
              {m === 'work' ? '勤務' : m === 'leave' ? '休暇' : 'OFF'}
            </button>
          ))}
        </div>

        {cell.patterns.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">シフトパターン</p>
            <div className="flex flex-wrap gap-1.5">
              {cell.patterns.map(p => (
                <button
                  key={p.code}
                  onClick={() => applyPattern(p)}
                  className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'work' && (
          <div className="space-y-3">
            {segments.map((seg, idx) => (
              <div key={idx} className="space-y-1.5">
                {segments.length > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500">時間帯 {idx + 1}</p>
                    <button
                      onClick={() => removeSegment(idx)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-12 flex-shrink-0">開始</label>
                  <select value={seg.startTime} onChange={e => updateSegment(idx, 'startTime', e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300">
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-12 flex-shrink-0">終了</label>
                  <select value={seg.endTime} onChange={e => updateSegment(idx, 'endTime', e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300">
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {idx < segments.length - 1 && <div className="border-b border-dashed border-gray-200 mt-1" />}
              </div>
            ))}

            {segments.length < 4 && (
              <button
                onClick={addSegment}
                className="w-full py-1.5 text-xs text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                ＋ 時間帯を追加
              </button>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-12 flex-shrink-0">休憩</label>
              <select value={breakMin} onChange={e => setBreakMin(e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300">
                {[0, 30, 45, 60, 75, 90].map(m => <option key={m} value={m}>{m}分</option>)}
              </select>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-[60]">{overlayContent}</div>
      </>
    );
  }

  const viewportH = window.innerHeight;
  const panelH = panelOpen ? Math.max(240, viewportH * 0.48) : 0;
  const availableH = viewportH - panelH;
  const overlayMaxH = Math.min(460, availableH - 8);

  // セルの下に表示、エリアをはみ出す場合は上にずらす
  let top = cell.anchorRect.bottom + 4;
  if (top + overlayMaxH > availableH) {
    top = availableH - overlayMaxH - 4;
  }
  top = Math.max(4, top);

  return (
    <>
      <div className="fixed inset-0 z-[55]" onClick={onClose} />
      <div
        className="fixed z-[60]"
        style={{
          left: Math.min(cell.anchorRect.left, window.innerWidth - 320),
          top,
          maxHeight: overlayMaxH,
        }}
      >
        {overlayContent}
      </div>
    </>
  );
}

// ─── Day Timeline Panel ───────────────────────────────────────────────────────

function DayTimelinePanel({
  date,
  staff,
  localOverrides,
  reservations,
  loading,
  onClose,
  onDragSave,
}: {
  date: string;
  staff: StaffRow[];
  localOverrides: Map<string, Shift>;
  reservations: DayReservation[];
  loading: boolean;
  onClose: () => void;
  onDragSave: (staffId: string, date: string, segs: { startTime: string; endTime: string }[]) => void;
}) {
  const dateObj = new Date(date + 'T12:00:00');
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dateLabel = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日(${dayNames[dateObj.getDay()]})`;

  return (
    <div
      className="day-timeline-panel fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-indigo-300 shadow-2xl flex flex-col"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{dateLabel} ラインシフト</span>
          {loading && <span className="text-xs text-gray-400 animate-pulse">読み込み中...</span>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 text-lg leading-none">✕</button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Time ruler */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="w-24 flex-shrink-0 border-r border-gray-100 bg-white" />
          <div className="flex-1 relative h-6">
            {/* 目盛り線（1時間・30分） */}
            {Array.from({ length: 79 }, (_, i) => {
              const min = TLINE_START_MIN + i * 10;
              const isHour = min % 60 === 0;
              const isHalf = !isHour && min % 30 === 0;
              if (!isHour && !isHalf) return null;
              return (
                <div
                  key={i}
                  className={`absolute bottom-0 w-px ${isHour ? 'h-3 bg-gray-400' : 'h-1.5 bg-gray-300'}`}
                  style={{ left: `${toPercent(min)}%` }}
                />
              );
            })}
            {/* 時刻ラベル（1時間ごと） */}
            {TLINE_HOURS.map((h, i) => {
              const pct = (i / (TLINE_HOURS.length - 1)) * 100;
              return (
                <span
                  key={h}
                  className="absolute text-[9px] text-gray-500 top-0 select-none"
                  style={{
                    left: `${pct}%`,
                    transform:
                      i === 0 ? 'none'
                      : i === TLINE_HOURS.length - 1 ? 'translateX(-100%)'
                      : 'translateX(-50%)',
                  }}
                >
                  {h}
                </span>
              );
            })}
          </div>
        </div>

        {/* Staff lanes */}
        {staff.map(member => {
          const shift =
            localOverrides.get(`${member.id}__${date}`) ??
            member.monthlyShifts.find(s => s.date === date)?.shift ??
            null;
          const memberResv = reservations.filter(r => r.staffId === member.id);
          return (
            <StaffShiftLane
              key={member.id}
              member={member}
              shift={shift}
              reservations={memberResv}
              date={date}
              onDragSave={onDragSave}
            />
          );
        })}
      </div>

      {/* Drag hint */}
      <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <p className="text-[10px] text-gray-400 text-center">空き部分をドラッグ → 時間帯を追加　／　設定済み部分をドラッグ → 時間帯を削除（10分刻み）</p>
      </div>
    </div>
  );
}

// ─── Staff Shift Lane (paint / erase drag) ────────────────────────────────────

function StaffShiftLane({
  member,
  shift,
  reservations,
  date,
  onDragSave,
}: {
  member: StaffRow;
  shift: Shift | null;
  reservations: DayReservation[];
  date: string;
  onDragSave: (staffId: string, date: string, segs: { startTime: string; endTime: string }[]) => void;
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const [paint, setPaint] = useState<{
    anchor: number;
    current: number;
    mode: 'paint' | 'erase';
  } | null>(null);

  const baseSegments: { start: number; end: number }[] = (() => {
    if (!shift?.isWorking) return [];
    if (shift.segments && shift.segments.length >= 2) {
      return shift.segments.map(s => ({ start: timeStrToMin(s.startTime), end: timeStrToMin(s.endTime) }));
    }
    if (shift.startTime && shift.endTime) {
      return [{ start: timeStrToMin(shift.startTime), end: timeStrToMin(shift.endTime) }];
    }
    return [];
  })();

  function getLaneMin(clientX: number): number {
    if (!laneRef.current) return TLINE_START_MIN;
    const rect = laneRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const raw = TLINE_START_MIN + ratio * TLINE_TOTAL_MIN;
    return Math.max(TLINE_START_MIN, Math.min(TLINE_END_MIN, Math.round(raw / 10) * 10));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const min = getLaneMin(e.clientX);
    // ドラッグ開始位置が既存セグメントの内側（端点を除く）→ erase モード
    const isErase = baseSegments.some(s => min > s.start && min < s.end);
    setPaint({ anchor: min, current: min, mode: isErase ? 'erase' : 'paint' });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!paint) return;
    const min = getLaneMin(e.clientX);
    setPaint(prev => prev ? { ...prev, current: min } : null);
  }

  function handlePointerUp() {
    if (!paint) return;
    const { anchor, mode } = paint;
    const start = Math.min(anchor, paint.current);
    const end   = Math.max(anchor, paint.current);
    setPaint(null);

    const existing = baseSegments.map(s => ({ startTime: minToTimeStr(s.start), endTime: minToTimeStr(s.end) }));

    if (mode === 'erase') {
      // クリックのみ（ほぼ動かず）→ anchor を含むセグメント全体を削除
      const result = end - start < 10
        ? existing.filter(seg => !(anchor >= timeStrToMin(seg.startTime) && anchor <= timeStrToMin(seg.endTime)))
        : subtractRange(existing, start, end);
      onDragSave(member.id, date, result);
    } else {
      if (end - start < 10) return;
      const merged = mergeSegments([...existing, { startTime: minToTimeStr(start), endTime: minToTimeStr(end) }]);
      onDragSave(member.id, date, merged);
    }
  }

  // ドラッグ中のライブプレビューを計算
  const isPainting = paint !== null;
  const range = paint ? { start: Math.min(paint.anchor, paint.current), end: Math.max(paint.anchor, paint.current) } : null;
  const existing = baseSegments.map(s => ({ startTime: minToTimeStr(s.start), endTime: minToTimeStr(s.end) }));

  let displaySegs = baseSegments;
  let eraseOverlay: { start: number; end: number } | null = null;

  if (isPainting && range) {
    if (paint!.mode === 'paint') {
      const merged = mergeSegments([...existing, { startTime: minToTimeStr(range.start), endTime: minToTimeStr(range.end) }]);
      displaySegs = merged.map(s => ({ start: timeStrToMin(s.startTime), end: timeStrToMin(s.endTime) }));
    } else {
      const subtracted = subtractRange(existing, range.start, range.end);
      displaySegs = subtracted.map(s => ({ start: timeStrToMin(s.startTime), end: timeStrToMin(s.endTime) }));
      eraseOverlay = range;
    }
  }

  return (
    <div className="flex items-center border-b border-gray-100">
      <div className="w-24 flex-shrink-0 px-2 py-2 border-r border-gray-100">
        <p className="text-xs font-medium text-gray-700 truncate">{member.name}</p>
      </div>

      <div
        ref={laneRef}
        className={`flex-1 relative h-12 select-none touch-none ${isPainting && paint?.mode === 'erase' ? 'cursor-cell' : 'cursor-crosshair'}`}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setPaint(null)}
      >
        {/* グリッド線: 10分(細)・30分(中)・1時間(太) */}
        {Array.from({ length: 79 }, (_, i) => {
          const min = TLINE_START_MIN + i * 10;
          const isHour = min % 60 === 0;
          const isHalf = !isHour && min % 30 === 0;
          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 ${
                isHour ? 'w-px bg-gray-400' :
                isHalf ? 'w-px bg-gray-200' :
                         'w-px bg-gray-100'
              }`}
              style={{ left: `${toPercent(min)}%` }}
            />
          );
        })}

        {/* シフトバー（ライブプレビュー） */}
        {displaySegs.map((seg, i) => {
          const left  = toPercent(seg.start);
          const width = toPercent(seg.end) - toPercent(seg.start);
          if (width <= 0) return null;
          return (
            <div
              key={i}
              className="absolute top-2 bottom-2 rounded bg-green-200 pointer-events-none"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {width > 8 && (
                <div className="absolute inset-0 flex items-center justify-center px-2">
                  <span className="text-[10px] font-semibold text-green-800 whitespace-nowrap select-none">
                    {minToTimeStr(seg.start)}–{minToTimeStr(seg.end)}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* 消去範囲オーバーレイ（赤） */}
        {eraseOverlay && eraseOverlay.end > eraseOverlay.start && (
          <div
            className="absolute top-1 bottom-1 rounded bg-red-200/80 border border-red-300 pointer-events-none"
            style={{
              left: `${toPercent(eraseOverlay.start)}%`,
              width: `${toPercent(eraseOverlay.end) - toPercent(eraseOverlay.start)}%`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center px-2">
              <span className="text-[10px] font-semibold text-red-700 whitespace-nowrap select-none">
                {minToTimeStr(eraseOverlay.start)}–{minToTimeStr(eraseOverlay.end)}
              </span>
            </div>
          </div>
        )}

        {/* OFF / 休暇 ラベル */}
        {!shift?.isWorking && !isPainting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-xs font-medium ${shift?.status === 'leave' ? 'text-yellow-500' : 'text-gray-300'}`}>
              {shift?.status === 'leave' ? '休暇' : 'OFF'}
            </span>
          </div>
        )}

        {/* 予約ブロック */}
        {reservations.map(res => {
          const rStart = timeStrToMin(res.startTime);
          const rEnd   = timeStrToMin(res.endTime);
          if (rEnd <= TLINE_START_MIN || rStart >= TLINE_END_MIN) return null;
          const category = res.items?.[0]?.category ?? '';
          const bg = CATEGORY_COLORS[category] ?? '#9CA3AF';
          const left  = toPercent(rStart);
          const width = toPercent(Math.min(rEnd, TLINE_END_MIN)) - toPercent(Math.max(rStart, TLINE_START_MIN));
          if (width <= 0) return null;
          return (
            <div
              key={res.id}
              className="absolute top-1 bottom-1 rounded flex items-center overflow-hidden px-1 opacity-80 pointer-events-none"
              style={{ left: `${left}%`, width: `${width}%`, backgroundColor: bg }}
              title={`${res.user?.name ?? '予約'} ${minToTimeStr(rStart)}–${minToTimeStr(rEnd)}`}
            >
              <span className="text-[9px] text-white font-medium truncate leading-tight">
                {res.user?.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pattern Manager Modal ────────────────────────────────────────────────────

type PatternForm = {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: string;
};

const emptyForm = (): PatternForm => ({
  code: '',
  name: '',
  startTime: '10:00',
  endTime: '19:00',
  breakMinutes: '60',
});

function PatternManagerModal({
  staff,
  onClose,
  onChanged,
}: {
  staff: StaffRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id ?? '');
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PatternForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchPatterns = useCallback(async (staffId: string) => {
    setLoadingPatterns(true);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/shift-patterns`);
      if (res.ok) setPatterns(await res.json());
    } finally {
      setLoadingPatterns(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStaffId) fetchPatterns(selectedStaffId);
  }, [selectedStaffId, fetchPatterns]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  }

  function openEdit(p: ShiftPattern) {
    setEditingId(p.id);
    setForm({
      code: p.code,
      name: p.name,
      startTime: p.startTime.slice(0, 5),
      endTime: p.endTime.slice(0, 5),
      breakMinutes: String(p.breakMinutes),
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      setError('コードと名前は必須です。');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/admin/staff/${selectedStaffId}/shift-patterns/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            startTime: form.startTime,
            endTime: form.endTime,
            breakMinutes: Number(form.breakMinutes),
          }),
        });
      } else {
        res = await fetch(`/api/admin/staff/${selectedStaffId}/shift-patterns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: form.code,
            name: form.name,
            startTime: form.startTime,
            endTime: form.endTime,
            breakMinutes: Number(form.breakMinutes),
          }),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '保存に失敗しました。');
        return;
      }
      setShowForm(false);
      await fetchPatterns(selectedStaffId);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(patternId: string) {
    await fetch(`/api/admin/staff/${selectedStaffId}/shift-patterns/${patternId}`, { method: 'DELETE' });
    await fetchPatterns(selectedStaffId);
    onChanged();
    toast.success('パターンを削除しました');
  }

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">シフトパターン管理</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        {/* Staff selector */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <label className="text-xs text-gray-500 block mb-1.5">スタッフ</label>
          <div className="flex flex-wrap gap-2">
            {staff.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedStaffId(s.id); setShowForm(false); }}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedStaffId === s.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loadingPatterns ? (
            <p className="text-sm text-gray-400 text-center py-8">読み込み中...</p>
          ) : patterns.length === 0 && !showForm ? (
            <p className="text-sm text-gray-400 text-center py-8">パターンがありません</p>
          ) : (
            patterns.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">{p.code}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.startTime.slice(0, 5)} – {p.endTime.slice(0, 5)}　休憩 {p.breakMinutes}分
                  </p>
                </div>
                <button
                  onClick={() => openEdit(p)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                >
                  編集
                </button>
                <button
                  onClick={() => setDeleteConfirmId(p.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
              </div>
            ))
          )}

          {/* Add/Edit form */}
          {showForm && (
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/30 space-y-3 mt-2">
              <p className="text-sm font-medium text-gray-700">{editingId ? 'パターンを編集' : '新しいパターン'}</p>

              {!editingId && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-20 flex-shrink-0">コード</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="例: A, B, morning"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-20 flex-shrink-0">名前</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例: 早番, 遅番"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-20 flex-shrink-0">開始</label>
                <select
                  value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-20 flex-shrink-0">終了</label>
                <select
                  value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-20 flex-shrink-0">休憩</label>
                <select
                  value={form.breakMinutes}
                  onChange={e => setForm(f => ({ ...f, breakMinutes: e.target.value }))}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  {[0, 30, 45, 60, 75, 90].map(m => <option key={m} value={m}>{m}分</option>)}
                </select>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showForm && selectedStaff && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={openNew}
              className="w-full py-2 text-sm text-indigo-600 border border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              ＋ パターンを追加 ({selectedStaff.name})
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="パターンを削除しますか？"
        description="この操作は取り消せません。"
        confirmLabel="削除"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmId) void handleDelete(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
      />
    </div>
  );
}
