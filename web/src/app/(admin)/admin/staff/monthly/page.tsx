'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, RefreshCcw, Send } from 'lucide-react';
import { CATEGORY_COLORS } from '@/constants/menu';

// ─── Types ────────────────────────────────────────────────────────────────────

type Shift = {
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
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
  TIME_OPTIONS.push(`${String(hour).padStart(2, '0')}:00`);
  if (hour < 23) TIME_OPTIONS.push(`${String(hour).padStart(2, '0')}:30`);
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

  async function handleDragSave(staffId: string, date: string, startTime: string, endTime: string) {
    const key = `${staffId}__${date}`;
    const existing = localOverrides.get(key) ??
      staff.find(s => s.id === staffId)?.monthlyShifts.find(m => m.date === date)?.shift;
    const newShift: Shift = {
      isWorking: true,
      startTime,
      endTime,
      breakMinutes: existing?.breakMinutes ?? 60,
      status: 'scheduled',
      source: 'manual',
    };
    // Optimistic update
    setLocalOverrides(prev => new Map(prev).set(key, newShift));
    // Persist
    fetch(`/api/admin/staff/${staffId}/schedule-override`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime, endTime, breakMinutes: newShift.breakMinutes, status: 'scheduled', source: 'manual' }),
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-2">
          <Link href="/admin/staff" className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-1 flex-1">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <input
              type="month"
              value={yyyymm}
              onChange={e => setYyyymm(e.target.value)}
              className="text-base font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer"
            />
            <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
              title="更新"
            >
              <RefreshCcw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href={csvUrl}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </a>
            <button
              onClick={handlePublishWeek}
              disabled={publishing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">公開</span>
            </button>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="px-4 py-2 flex items-center gap-4 text-xs text-gray-500 bg-white border-b border-gray-100">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> 勤務</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" /> 公開済</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block" /> 休暇</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> OFF</span>
        <span className="ml-auto text-gray-400">日付をタップ→ラインシフト</span>
      </div>

      {/* Grid */}
      <div className={`flex-1 overflow-auto ${selectedDay ? 'pb-72' : ''}`}>
        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : (
          <div
            className="relative"
            style={{
              display: 'grid',
              gridTemplateColumns: `160px repeat(${days.length}, minmax(48px, 1fr))`,
              minWidth: `${160 + days.length * 48}px`,
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
                  className={`sticky top-0 z-10 border-b-2 border-r border-gray-100 text-center py-1.5 transition-colors ${
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
    </div>
  );
}

// ─── Shift Edit Overlay ───────────────────────────────────────────────────────

function ShiftEditOverlay({
  cell,
  onClose,
  onSave,
}: {
  cell: ActiveCell;
  onClose: () => void;
  onSave: (staffId: string, date: string, shift: Shift) => void;
}) {
  const [mode, setMode] = useState<'work' | 'off' | 'leave'>(
    !cell.shift || !cell.shift.isWorking
      ? (cell.shift?.status === 'leave' ? 'leave' : 'off')
      : 'work'
  );
  const [startTime, setStartTime] = useState(cell.shift?.startTime?.slice(0, 5) ?? '10:00');
  const [endTime, setEndTime] = useState(cell.shift?.endTime?.slice(0, 5) ?? '19:00');
  const [breakMin, setBreakMin] = useState(String(cell.shift?.breakMinutes ?? 60));
  const [saving, setSaving] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const dateObj = new Date(cell.date + 'T12:00:00');
  const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}(${['日','月','火','水','木','金','土'][dateObj.getDay()]})`;

  function applyPattern(p: ShiftPattern) {
    setMode('work');
    setStartTime(p.startTime.slice(0, 5));
    setEndTime(p.endTime.slice(0, 5));
    setBreakMin(String(p.breakMinutes));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let body: Record<string, unknown>;
      if (mode === 'work') {
        body = { date: cell.date, startTime, endTime, breakMinutes: Number(breakMin), status: 'scheduled', source: 'manual' };
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
        const newShift: Shift = {
          isWorking: mode === 'work',
          startTime: mode === 'work' ? startTime : null,
          endTime: mode === 'work' ? endTime : null,
          breakMinutes: mode === 'work' ? Number(breakMin) : 0,
          status: mode === 'work' ? 'scheduled' : mode === 'leave' ? 'leave' : 'off',
          source: 'manual',
        };
        onSave(cell.staffId, cell.date, newShift);
      } else {
        alert('保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  }

  const overlayContent = (
    <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 w-72 ${isMobile ? 'w-full rounded-b-none' : ''}`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{cell.staffName}</p>
          <p className="text-sm font-semibold text-gray-900">{dateLabel}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
      </div>

      <div className="p-4 space-y-4">
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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-12 flex-shrink-0">開始</label>
              <select value={startTime} onChange={e => setStartTime(e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-12 flex-shrink-0">終了</label>
              <select value={endTime} onChange={e => setEndTime(e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
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
        <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-50">{overlayContent}</div>
      </>
    );
  }

  const viewportH = window.innerHeight;
  const top = cell.anchorRect.bottom + window.scrollY + 4;
  const bottom = viewportH - cell.anchorRect.top + window.scrollY + 4;
  const useTop = cell.anchorRect.bottom + 320 < viewportH;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50"
        style={{
          left: Math.min(cell.anchorRect.left, window.innerWidth - 300),
          ...(useTop ? { top } : { bottom }),
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
  onDragSave: (staffId: string, date: string, startTime: string, endTime: string) => void;
}) {
  const dateObj = new Date(date + 'T12:00:00');
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dateLabel = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日(${dayNames[dateObj.getDay()]})`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-indigo-300 shadow-2xl flex flex-col"
      style={{ height: '48vh', minHeight: 240 }}
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
        <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="w-24 flex-shrink-0 border-r border-gray-100 bg-white" />
          <div className="flex-1 flex">
            {TLINE_HOURS.map(h => (
              <div
                key={h}
                className="text-[9px] text-gray-400 border-r border-gray-100 py-1 text-center flex-1"
              >
                {h}
              </div>
            ))}
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
        <p className="text-[10px] text-gray-400 text-center">緑バーの端をドラッグしてシフト時間を調整できます</p>
      </div>
    </div>
  );
}

// ─── Staff Shift Lane (with drag) ─────────────────────────────────────────────

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
  onDragSave: (staffId: string, date: string, startTime: string, endTime: string) => void;
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const dragEdgeRef = useRef<'start' | 'end' | null>(null);
  const [dragMin, setDragMin] = useState<{ start: number; end: number } | null>(null);

  const baseStart = shift?.isWorking && shift.startTime ? timeStrToMin(shift.startTime) : null;
  const baseEnd = shift?.isWorking && shift.endTime ? timeStrToMin(shift.endTime) : null;
  const displayStart = dragMin?.start ?? baseStart;
  const displayEnd = dragMin?.end ?? baseEnd;

  function getLaneMin(clientX: number): number {
    if (!laneRef.current) return TLINE_START_MIN;
    const rect = laneRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const raw = TLINE_START_MIN + ratio * TLINE_TOTAL_MIN;
    const snapped = Math.round(raw / 30) * 30;
    return Math.max(TLINE_START_MIN, Math.min(TLINE_END_MIN, snapped));
  }

  function handleEdgePointerDown(e: React.PointerEvent<HTMLDivElement>, edge: 'start' | 'end') {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragEdgeRef.current = edge;
    setDragMin({
      start: displayStart ?? TLINE_START_MIN,
      end: displayEnd ?? TLINE_END_MIN,
    });
  }

  function handleEdgePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragEdgeRef.current) return;
    const newMin = getLaneMin(e.clientX);
    setDragMin(prev => {
      if (!prev) return prev;
      if (dragEdgeRef.current === 'start') {
        return { start: Math.min(newMin, prev.end - 30), end: prev.end };
      } else {
        return { start: prev.start, end: Math.max(newMin, prev.start + 30) };
      }
    });
  }

  function handleEdgePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragEdgeRef.current || !dragMin) {
      dragEdgeRef.current = null;
      return;
    }
    dragEdgeRef.current = null;
    const finalStart = dragMin.start;
    const finalEnd = dragMin.end;
    setDragMin(null);
    onDragSave(member.id, date, minToTimeStr(finalStart), minToTimeStr(finalEnd));
  }

  const shiftLeft = displayStart !== null ? toPercent(displayStart) : 0;
  const shiftWidth =
    displayStart !== null && displayEnd !== null
      ? toPercent(displayEnd) - toPercent(displayStart)
      : 0;
  const isDragging = dragMin !== null;

  return (
    <div className="flex items-center border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
      {/* Staff name */}
      <div className="w-24 flex-shrink-0 px-2 py-2 border-r border-gray-100">
        <p className="text-xs font-medium text-gray-700 truncate">{member.name}</p>
      </div>

      {/* Timeline lane */}
      <div ref={laneRef} className="flex-1 relative h-12 select-none">
        {/* Hour grid lines */}
        {TLINE_HOURS.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-100"
            style={{ left: `${(i / (TLINE_HOURS.length - 1)) * 100}%` }}
          />
        ))}

        {/* Shift bar */}
        {displayStart !== null && displayEnd !== null && shiftWidth > 0 && (
          <div
            className={`absolute top-2 bottom-2 rounded transition-none ${isDragging ? 'bg-green-400 shadow-md' : 'bg-green-200'}`}
            style={{ left: `${shiftLeft}%`, width: `${shiftWidth}%` }}
          >
            {/* Start edge handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center touch-none z-10"
              onPointerDown={e => handleEdgePointerDown(e, 'start')}
              onPointerMove={handleEdgePointerMove}
              onPointerUp={handleEdgePointerUp}
            >
              <div className="w-1 h-6 bg-green-600 rounded-full opacity-70 hover:opacity-100" />
            </div>

            {/* Time label */}
            {shiftWidth > 8 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
                <span className="text-[10px] font-semibold text-green-900 select-none whitespace-nowrap">
                  {minToTimeStr(displayStart)}–{minToTimeStr(displayEnd)}
                </span>
              </div>
            )}

            {/* End edge handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center touch-none z-10"
              onPointerDown={e => handleEdgePointerDown(e, 'end')}
              onPointerMove={handleEdgePointerMove}
              onPointerUp={handleEdgePointerUp}
            >
              <div className="w-1 h-6 bg-green-600 rounded-full opacity-70 hover:opacity-100" />
            </div>
          </div>
        )}

        {/* OFF / 休暇 label */}
        {!shift?.isWorking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-xs font-medium ${shift?.status === 'leave' ? 'text-yellow-500' : 'text-gray-300'}`}>
              {shift?.status === 'leave' ? '休暇' : 'OFF'}
            </span>
          </div>
        )}

        {/* Reservation blocks */}
        {reservations.map(res => {
          const rStart = timeStrToMin(res.startTime);
          const rEnd = timeStrToMin(res.endTime);
          if (rEnd <= TLINE_START_MIN || rStart >= TLINE_END_MIN) return null;
          const category = res.items?.[0]?.category ?? '';
          const bg = CATEGORY_COLORS[category] ?? '#9CA3AF';
          const left = toPercent(rStart);
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
