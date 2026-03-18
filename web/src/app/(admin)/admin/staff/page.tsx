'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Clock,
  RefreshCcw,
  Users,
  X,
} from 'lucide-react';
import { formatLocalDate } from '@/lib/date-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_OPTIONS: string[] = [];
for (let hour = 8; hour <= 22; hour++) {
  TIME_OPTIONS.push(`${String(hour).padStart(2, '0')}:00`);
  if (hour < 22) TIME_OPTIONS.push(`${String(hour).padStart(2, '0')}:30`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shiftLabel(shift: Shift | null | undefined) {
  if (!shift?.isWorking || !shift.startTime || !shift.endTime) return '休み';
  return `${shift.startTime.slice(0, 5)} - ${shift.endTime.slice(0, 5)}`;
}

function AttendanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    late:      { label: '遅刻',   cls: 'bg-amber-100 text-amber-700' },
    overtime:  { label: '残業',   cls: 'bg-violet-100 text-violet-700' },
    on_break:  { label: '休憩中', cls: 'bg-sky-100 text-sky-700' },
    working:   { label: '出勤中', cls: 'bg-emerald-100 text-emerald-700' },
    completed: { label: '退勤済', cls: 'bg-gray-100 text-gray-600' },
  };
  const info = map[status];
  if (!info) return null;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.cls}`}>{info.label}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffHomePage() {
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [dayOps, setDayOps] = useState<{ summary?: Record<string, number>; rows?: DayOpsRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const loadData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [dayRes, reqRes] = await Promise.all([
        fetch(`/api/admin/staff/day-ops?date=${date}`),
        fetch('/api/admin/requests'),
      ]);
      if (dayRes.ok) setDayOps(await dayRes.json());
      if (reqRes.ok) {
        const reqs = await reqRes.json();
        setPendingRequestCount(Array.isArray(reqs) ? reqs.filter((r: { status: string }) => r.status === 'submitted').length : 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(selectedDate); }, [loadData, selectedDate]);

  async function act(task: () => Promise<void>, successMsg: string) {
    try {
      setBusy(true);
      setMessage(null);
      await task();
      setMessage({ text: successMsg, ok: true });
      await loadData(selectedDate);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '操作に失敗しました', ok: false });
    } finally {
      setBusy(false);
    }
  }

  const summary = dayOps?.summary ?? {};
  const rows = dayOps?.rows ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-base font-semibold text-gray-900">スタッフ管理</h1>
              <p className="text-xs text-gray-500">今日の勤怠・シフト・申請</p>
            </div>
            <button
              onClick={() => void loadData(selectedDate)}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
            >
              <RefreshCcw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Sub-navigation hub */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 今日の勤怠 — current page (highlighted) */}
          <div className="bg-emerald-600 text-white rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">今日の勤怠</p>
              <p className="text-xs opacity-75">打刻・出退勤</p>
            </div>
          </div>

          <Link
            href="/admin/staff/monthly"
            className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
          >
            <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">月次シフト</p>
              <p className="text-xs text-gray-400">シフト表作成</p>
            </div>
          </Link>

          <Link
            href="/admin/requests"
            className="relative bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
          >
            <div className="p-2 bg-rose-50 rounded-lg flex-shrink-0 group-hover:bg-rose-100 transition-colors">
              <ClipboardList className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">申請承認</p>
              <p className="text-xs text-gray-400">勤怠・休暇申請</p>
            </div>
            {pendingRequestCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {pendingRequestCount}
              </span>
            )}
          </Link>

          <Link
            href="/admin/staff/list"
            className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
          >
            <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 group-hover:bg-gray-200 transition-colors">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">スタッフ一覧</p>
              <p className="text-xs text-gray-400">プロフィール管理</p>
            </div>
          </Link>
        </div>

        {/* Date picker + message */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-emerald-300"
          />
          {message && (
            <span className={`text-xs px-3 py-1 rounded-full ${message.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </span>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '予定出勤', value: summary.scheduledCount ?? 0, color: 'text-gray-900' },
            { label: '出勤中',   value: summary.clockedInCount ?? 0, color: 'text-emerald-700' },
            { label: '休憩中',   value: summary.onBreakCount ?? 0,   color: 'text-amber-700' },
            { label: '要確認',   value: summary.alertCount ?? 0,     color: 'text-rose-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Staff rows */}
        <div className="space-y-3">
          {loading && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">読み込み中...</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">本日のスタッフ情報がありません</div>
          )}
          {rows.map(row => (
            <div key={row.staffId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-emerald-700">{row.staffName.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{row.staffName}</p>
                    <p className="text-xs text-gray-400">{row.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {row.attendance?.status && <AttendanceStatusBadge status={row.attendance.status} />}
                  {row.pendingRequestCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">未処理申請 {row.pendingRequestCount}</span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-gray-400 mb-0.5">予定シフト</p><p className="font-medium text-gray-800">{shiftLabel(row.shift)}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">実績</p><p className="text-gray-700">{row.attendance?.actualStartTime?.slice(0, 5) || '--:--'} / {row.attendance?.actualEndTime?.slice(0, 5) || '--:--'}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">予約数</p><p className="text-gray-700">{row.reservationCount} 件</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">有休残</p><p className="text-gray-700">{row.leaveBalance.remaining.toFixed(1)} 日</p></div>
              </div>

              <div className="px-4 pb-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void act(async () => {
                    const res = await fetch('/api/admin/attendance/clock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: row.staffId, date: selectedDate, action: 'clock_in' }) });
                    if (!res.ok) throw new Error('出勤打刻に失敗しました');
                  }, `${row.staffName} 出勤を記録`)}
                  disabled={busy}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >出勤</button>
                <button
                  onClick={() => void act(async () => {
                    const res = await fetch('/api/admin/attendance/break', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: row.staffId, date: selectedDate, action: row.activeBreak ? 'end' : 'start' }) });
                    if (!res.ok) throw new Error('休憩更新に失敗しました');
                  }, row.activeBreak ? `${row.staffName} 休憩終了` : `${row.staffName} 休憩開始`)}
                  disabled={busy}
                  className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >{row.activeBreak ? '休憩終了' : '休憩開始'}</button>
                <button
                  onClick={() => void act(async () => {
                    const res = await fetch('/api/admin/attendance/clock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: row.staffId, date: selectedDate, action: 'clock_out' }) });
                    if (!res.ok) throw new Error('退勤打刻に失敗しました');
                  }, `${row.staffName} 退勤を記録`)}
                  disabled={busy}
                  className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                >退勤</button>
                <button
                  onClick={() => setEditor({ staffId: row.staffId, staffName: row.staffName, date: selectedDate, startTime: row.shift?.startTime?.slice(0, 5) || '10:00', endTime: row.shift?.endTime?.slice(0, 5) || '19:00', breakMinutes: row.shift?.breakMinutes || 60, status: row.shift?.status || 'scheduled', note: row.shift?.note || '' })}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >日別修正</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shift edit modal */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{editor.staffName}</h3>
                <p className="text-xs text-gray-500">{editor.date} 日別シフト修正</p>
              </div>
              <button onClick={() => setEditor(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <select value={editor.status} onChange={e => setEditor(prev => prev ? { ...prev, status: e.target.value } : prev)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300">
                <option value="scheduled">勤務</option>
                <option value="off">休み</option>
                <option value="leave">休暇</option>
                <option value="published">公開済み</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={editor.startTime} onChange={e => setEditor(prev => prev ? { ...prev, startTime: e.target.value } : prev)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300">
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={editor.endTime} onChange={e => setEditor(prev => prev ? { ...prev, endTime: e.target.value } : prev)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300">
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input type="number" value={editor.breakMinutes} onChange={e => setEditor(prev => prev ? { ...prev, breakMinutes: Number(e.target.value) } : prev)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300" placeholder="休憩分" />
              <textarea value={editor.note} onChange={e => setEditor(prev => prev ? { ...prev, note: e.target.value } : prev)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300 resize-none" placeholder="メモ" />
              <button
                onClick={() => void act(async () => {
                  const res = await fetch(`/api/admin/staff/${editor.staffId}/schedule-override`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: editor.date, startTime: editor.status === 'off' ? null : editor.startTime, endTime: editor.status === 'off' ? null : editor.endTime, breakMinutes: editor.breakMinutes, status: editor.status, note: editor.note }) });
                  if (!res.ok) throw new Error('日別シフトの保存に失敗しました');
                  setEditor(null);
                }, '日別シフトを更新しました')}
                disabled={busy}
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
              >{busy ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
