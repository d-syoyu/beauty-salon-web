'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Sun,
  Moon,
  Upload,
  Check,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const TIMELINE_START = 8;
const TIMELINE_END = 22;
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;

const TIME_OPTIONS: string[] = [];
for (let h = TIMELINE_START; h <= TIMELINE_END; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < TIMELINE_END) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

const AVATAR_COLORS = [
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#f3e8ff', fg: '#7e22ce' },
  { bg: '#fef3c7', fg: '#b45309' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface ScheduleOverride {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
}

interface StaffData {
  id: string;
  name: string;
  role: string;
  image: string | null;
  schedules: Schedule[];
  scheduleOverrides: ScheduleOverride[];
}

interface EffectiveShift {
  isWorking: boolean;
  startTime: string;
  endTime: string;
  isOverride: boolean;
}

interface ShiftEditor {
  staffId: string;
  staffName: string;
  staffImage: string | null;
  dateStr: string;
  dateLabel: string;
  mode: 'work' | 'off';
  startTime: string;
  endTime: string;
  hasOverride: boolean;
}

interface CsvPreviewRow {
  row: number;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'ok' | 'warning' | 'error';
  error?: string;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
}

function getEffectiveShift(staff: StaffData, date: Date): EffectiveShift | null {
  const ds = toDateStr(date);
  const dow = date.getDay();

  const ov = staff.scheduleOverrides.find((o) => {
    const od = typeof o.date === 'string' ? o.date.slice(0, 10) : '';
    return od === ds;
  });

  if (ov) {
    if (ov.startTime && ov.endTime) {
      return { isWorking: true, startTime: ov.startTime, endTime: ov.endTime, isOverride: true };
    }
    return { isWorking: false, startTime: '', endTime: '', isOverride: true };
  }

  const sched = staff.schedules.find((s) => s.dayOfWeek === dow && s.isActive);
  if (sched) {
    return { isWorking: true, startTime: sched.startTime, endTime: sched.endTime, isOverride: false };
  }

  return null;
}

function StaffAvatar({ name, image, size = 24 }: { name: string; image: string | null; size?: number }) {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: Math.max(size * 0.4, 10), backgroundColor: color.bg, color: color.fg }}
    >
      {name.charAt(0)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function StaffSchedulePage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [staffData, setStaffData] = useState<StaffData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editor, setEditor] = useState<ShiftEditor | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // CSV import
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[] | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvFile(e.target.files?.[0] || null);
    setCsvPreview(null);
    setCsvError(null);
    setCsvSuccess(null);
  };

  const handleCsvPreview = async () => {
    if (!csvFile) return;
    setCsvError(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await fetch('/api/admin/staff/import-schedule?preview=true', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'プレビューに失敗しました');
      }
      const data = await res.json();
      setCsvPreview(data.rows || data);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleCsvConfirm = async () => {
    if (!csvFile) return;
    setCsvError(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await fetch('/api/admin/staff/import-schedule', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'インポートに失敗しました');
      }
      setCsvSuccess('スケジュールをインポートしました');
      setCsvPreview(null);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchData();
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const resetCsvImport = () => {
    setCsvPreview(null);
    setCsvFile(null);
    setCsvError(null);
    setCsvSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const y = currentMonth.getFullYear();
      const m = currentMonth.getMonth() + 1;
      const res = await fetch(`/api/admin/staff/schedule-overview?year=${y}&month=${m}`);
      const data = await res.json();
      setStaffData(data.staff || []);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calendar helpers
  const generateCalendarDays = (): (Date | null)[] => {
    const days: (Date | null)[] = [];
    const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }
    return days;
  };

  const isSelected = (d: Date) => selectedDate?.toDateString() === d.toDateString();
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

  // Navigation
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };
  const goToToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  // Editor
  const openEditor = (staff: StaffData, date: Date) => {
    const shift = getEffectiveShift(staff, date);
    const defaultSched = staff.schedules.find((s) => s.dayOfWeek === date.getDay() && s.isActive);
    setEditor({
      staffId: staff.id,
      staffName: staff.name,
      staffImage: staff.image,
      dateStr: toDateStr(date),
      dateLabel: formatDateLabel(date),
      mode: shift?.isWorking ? 'work' : 'off',
      startTime: shift?.isWorking ? shift.startTime : defaultSched?.startTime || '10:00',
      endTime: shift?.isWorking ? shift.endTime : defaultSched?.endTime || '20:00',
      hasOverride: shift?.isOverride || false,
    });
  };

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      const body =
        editor.mode === 'work'
          ? { date: editor.dateStr, startTime: editor.startTime, endTime: editor.endTime }
          : { date: editor.dateStr, startTime: null, endTime: null };
      await fetch(`/api/admin/staff/${editor.staffId}/schedule-override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setEditor(null);
      await fetchData();
    } catch {
      /* ignore */
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      await fetch(`/api/admin/staff/${editor.staffId}/schedule-override?date=${editor.dateStr}`, {
        method: 'DELETE',
      });
      setEditor(null);
      await fetchData();
    } catch {
      /* ignore */
    } finally {
      setIsSaving(false);
    }
  };

  const timeToPercent = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (((h - TIMELINE_START) * 60 + m) / (TIMELINE_HOURS * 60)) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/staff" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-medium">シフト管理</h1>
            <p className="text-sm text-gray-500 mt-1">カレンダーで各スタッフのシフトを確認・編集</p>
          </div>
          <button
            onClick={() => { setShowCsvImport(!showCsvImport); setCsvSuccess(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
              showCsvImport
                ? 'bg-gray-800 text-white'
                : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-4 h-4" />
            CSVインポート
          </button>
        </div>

        {/* CSV Import */}
        {showCsvImport && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-medium mb-4">CSVスケジュールインポート</h3>
            <p className="text-xs text-gray-500 mb-4">
              CSVファイルから日付指定のシフトを一括登録します。形式: スタッフ名, 日付, 開始時間, 終了時間
            </p>

            {csvError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {csvError}
              </div>
            )}
            {csvSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
                {csvSuccess}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 py-2 px-4 rounded-lg text-sm bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  ファイルを選択
                </button>
                <span className="text-sm text-gray-500">
                  {csvFile ? csvFile.name : 'ファイルが選択されていません'}
                </span>
              </div>
              <button
                onClick={handleCsvPreview}
                disabled={!csvFile}
                className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                プレビュー
              </button>
            </div>

            {csvPreview && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">行</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">スタッフ名</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">日付</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">開始</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">終了</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">ステータス</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">メッセージ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3">{row.row}</td>
                          <td className="py-2 px-3">{row.staffName}</td>
                          <td className="py-2 px-3">{row.date}</td>
                          <td className="py-2 px-3">{row.startTime}</td>
                          <td className="py-2 px-3">{row.endTime}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                row.status === 'ok'
                                  ? 'bg-green-100 text-green-700'
                                  : row.status === 'warning'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {row.status === 'ok' ? 'OK' : row.status === 'warning' ? '補正' : 'エラー'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-500 text-xs">
                            {row.error || row.warning || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={resetCsvImport}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleCsvConfirm}
                    disabled={csvPreview.some((r) => r.status === 'error')}
                    className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Check className="w-4 h-4 inline mr-1" />
                    インポート実行
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </h2>
              <button
                onClick={goToToday}
                className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
              >
                今日
              </button>
            </div>
            <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day, i) => (
              <div
                key={day}
                className={`text-center text-xs font-medium py-1 ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="py-16 text-center text-gray-400">読み込み中...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((date, i) => {
                if (!date) return <div key={i} className="aspect-[4/3]" />;

                const dow = date.getDay();
                const isMonday = dow === 1;
                const working = staffData.filter((s) => getEffectiveShift(s, date)?.isWorking);
                const maxIcons = 4;
                const overflow = working.length - maxIcons;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-[4/3] p-1 rounded-lg transition-all text-left flex flex-col ${
                      isSelected(date)
                        ? 'bg-gray-800 text-white ring-2 ring-gray-800 ring-offset-1'
                        : isToday(date)
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : isMonday
                            ? 'bg-red-50/50 hover:bg-red-100/50'
                            : 'hover:bg-gray-100'
                    }`}
                  >
                    <span
                      className={`text-xs font-medium leading-none ${
                        isSelected(date)
                          ? 'text-white'
                          : isToday(date)
                            ? 'text-blue-600'
                            : dow === 0
                              ? 'text-red-400'
                              : dow === 6
                                ? 'text-blue-400'
                                : isMonday
                                  ? 'text-red-300'
                                  : ''
                      }`}
                    >
                      {date.getDate()}
                      {isMonday && !isSelected(date) && (
                        <span className="ml-0.5 text-[9px] text-red-300">休</span>
                      )}
                    </span>

                    <div className="flex-1 flex items-end">
                      <div className="flex -space-x-1">
                        {working.slice(0, maxIcons).map((s) => (
                          <StaffAvatar key={s.id} name={s.name} image={s.image} size={18} />
                        ))}
                        {overflow > 0 && (
                          <span className={`text-[9px] ml-1 self-end ${isSelected(date) ? 'text-gray-300' : 'text-gray-400'}`}>
                            +{overflow}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
              <span>定休日（月曜）</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
              <span>今日</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {selectedDate && !isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <h3 className="text-lg font-medium mb-1">{formatDateLabel(selectedDate)} のシフト</h3>

            {selectedDate.getDay() === 1 && (
              <p className="text-xs text-red-500 mb-3">※ 月曜日は定休日です（個別にシフト設定可能）</p>
            )}

            {staffData.length === 0 ? (
              <p className="text-gray-400 py-6">スタッフが登録されていません</p>
            ) : (
              <div className="mt-4">
                {/* Time labels */}
                <div className="relative h-5 mb-1 ml-28 md:ml-36">
                  {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
                    if (i % 2 !== 0) return null;
                    const left = (i / TIMELINE_HOURS) * 100;
                    const tx = i === 0 ? 'translate-x-0' : i === TIMELINE_HOURS ? '-translate-x-full' : '-translate-x-1/2';
                    return (
                      <div key={i} className={`absolute text-[10px] text-gray-400 ${tx}`} style={{ left: `${left}%` }}>
                        {TIMELINE_START + i}:00
                      </div>
                    );
                  })}
                </div>

                {/* Staff lanes */}
                {staffData.map((staff) => {
                  const shift = getEffectiveShift(staff, selectedDate);
                  const isWorking = shift?.isWorking || false;
                  const isOverride = shift?.isOverride || false;

                  return (
                    <button
                      key={staff.id}
                      onClick={() => openEditor(staff, selectedDate)}
                      className="w-full flex items-center gap-2 mb-1 group cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors"
                    >
                      {/* Staff info */}
                      <div className="w-24 md:w-32 flex-shrink-0 flex items-center gap-2">
                        <StaffAvatar name={staff.name} image={staff.image} size={28} />
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-medium truncate">{staff.name}</p>
                          <p className="text-[10px] text-gray-400">{staff.role}</p>
                        </div>
                      </div>

                      {/* Timeline bar */}
                      <div className="flex-1 relative h-9 bg-gray-100 rounded-lg overflow-hidden">
                        {/* Grid lines */}
                        {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => (
                          <div
                            key={i}
                            className={`absolute top-0 bottom-0 ${i % 2 === 0 ? 'border-l border-gray-200' : 'border-l border-gray-200/40'}`}
                            style={{ left: `${(i / TIMELINE_HOURS) * 100}%` }}
                          />
                        ))}

                        {/* Current time indicator */}
                        {selectedDate.toDateString() === new Date().toDateString() &&
                          (() => {
                            const now = new Date();
                            const mins = (now.getHours() - TIMELINE_START) * 60 + now.getMinutes();
                            if (mins >= 0 && mins <= TIMELINE_HOURS * 60) {
                              return (
                                <div
                                  className="absolute top-0 bottom-0 z-10 pointer-events-none"
                                  style={{ left: `${(mins / (TIMELINE_HOURS * 60)) * 100}%` }}
                                >
                                  <div className="h-full border-l-2 border-red-400" />
                                </div>
                              );
                            }
                            return null;
                          })()}

                        {/* Shift bar */}
                        {isWorking && shift && (
                          <div
                            className={`absolute top-1 bottom-1 rounded-md transition-all group-hover:brightness-110 ${
                              isOverride
                                ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                            }`}
                            style={{
                              left: `${timeToPercent(shift.startTime)}%`,
                              width: `${timeToPercent(shift.endTime) - timeToPercent(shift.startTime)}%`,
                            }}
                          >
                            <span className="h-full flex items-center justify-center text-white text-[10px] font-medium whitespace-nowrap">
                              {shift.startTime}〜{shift.endTime}
                            </span>
                          </div>
                        )}

                        {/* Day off (override) */}
                        {!isWorking && isOverride && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-red-400 text-xs font-medium flex items-center gap-1">
                              <Moon className="w-3 h-3" /> 休み
                            </span>
                          </div>
                        )}

                        {/* No schedule */}
                        {!shift && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-300 text-[10px]">シフトなし</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-3 rounded bg-gradient-to-r from-emerald-400 to-emerald-500" />
                    <span>通常シフト</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-3 rounded bg-gradient-to-r from-blue-400 to-blue-500" />
                    <span>変更シフト</span>
                  </div>
                  <span className="text-gray-300">クリックで編集</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSaving && setEditor(null)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => !isSaving && setEditor(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Staff info */}
            <div className="flex items-center gap-3 mb-6">
              <StaffAvatar name={editor.staffName} image={editor.staffImage} size={40} />
              <div>
                <h3 className="text-lg font-medium">{editor.staffName}</h3>
                <p className="text-sm text-gray-500">{editor.dateLabel}</p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setEditor({ ...editor, mode: 'work' })}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  editor.mode === 'work'
                    ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Sun className="w-4 h-4" /> 出勤
              </button>
              <button
                onClick={() => setEditor({ ...editor, mode: 'off' })}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  editor.mode === 'off'
                    ? 'bg-red-50 text-red-700 ring-2 ring-red-400'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Moon className="w-4 h-4" /> 休み
              </button>
            </div>

            {/* Time inputs */}
            {editor.mode === 'work' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">開始時間</label>
                  <select
                    value={editor.startTime}
                    onChange={(e) => {
                      const st = e.target.value;
                      const newEditor = { ...editor, startTime: st };
                      if (st >= editor.endTime) {
                        const next = TIME_OPTIONS.find((t) => t > st);
                        if (next) newEditor.endTime = next;
                      }
                      setEditor(newEditor);
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-400"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">終了時間</label>
                  <select
                    value={editor.endTime}
                    onChange={(e) => setEditor({ ...editor, endTime: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-400"
                  >
                    {TIME_OPTIONS.filter((t) => t > editor.startTime).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {editor.hasOverride && (
                <button
                  onClick={handleReset}
                  disabled={isSaving}
                  className="px-4 py-3 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" /> 通常に戻す
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setEditor(null)}
                disabled={isSaving}
                className="px-4 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
