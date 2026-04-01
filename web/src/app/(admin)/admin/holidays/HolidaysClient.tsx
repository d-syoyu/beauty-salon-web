'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarCheck,
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export interface Holiday {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
}

export interface SpecialOpenDay {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
}

interface HolidaysClientProps {
  year: number;
  month: number;
  initialClosedDays: number[];
}

export default function HolidaysClient({ year, month, initialClosedDays }: HolidaysClientProps) {
  const [currentYear, setCurrentYear] = useState(year);
  const [currentMonth, setCurrentMonth] = useState(month);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [specialOpenDays, setSpecialOpenDays] = useState<SpecialOpenDay[]>([]);
  const [closedDays, setClosedDays] = useState(initialClosedDays);
  const [isLoadingMonth, setIsLoadingMonth] = useState(true);
  const [isSavingClosedDays, setIsSavingClosedDays] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalType, setModalType] = useState<'holiday' | 'special-open' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'holiday' | 'special-open'; id: string; label: string; reason: string | null } | null>(null);
  const [reason, setReason] = useState('');
  const [timeMode, setTimeMode] = useState<'allDay' | 'timeRange'>('allDay');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');

  const showSuccess = (message: string) => { setSuccess(message); setTimeout(() => setSuccess(null), 3000); };
  const showError = (message: string) => { setError(message); setTimeout(() => setError(null), 6000); };
  const getDateStr = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const formatDateLabel = (dateStr: string) => { const d = new Date(dateStr); return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`; };
  const formatTimeLabel = (start: string | null, end: string | null, allDayLabel: string) => (start && end ? `${start} - ${end}` : allDayLabel);
  const isClosedDayOfWeek = (date: Date) => closedDays.includes(date.getDay());
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const loadMonthData = useCallback(async (targetYear = currentYear, targetMonth = currentMonth) => {
    setIsLoadingMonth(true);
    try {
      const [holidaysResponse, specialOpenResponse] = await Promise.all([
        fetch(`/api/admin/holidays?year=${targetYear}&month=${targetMonth}`, { cache: 'no-store' }),
        fetch(`/api/admin/special-open-days?year=${targetYear}&month=${targetMonth}`, { cache: 'no-store' }),
      ]);
      if (!holidaysResponse.ok || !specialOpenResponse.ok) throw new Error('月データの読み込みに失敗しました');
      setHolidays(await holidaysResponse.json());
      setSpecialOpenDays(await specialOpenResponse.json());
    } catch (err) {
      showError(err instanceof Error ? err.message : '月データの読み込みに失敗しました');
    } finally {
      setIsLoadingMonth(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    setCurrentYear(year);
    setCurrentMonth(month);
  }, [year, month]);

  useEffect(() => { void loadMonthData(currentYear, currentMonth); }, [currentYear, currentMonth, loadMonthData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?year=${currentYear}&month=${currentMonth}`);
    }
  }, [currentYear, currentMonth]);

  const navigateMonth = (delta: number) => {
    let nextYear = currentYear;
    let nextMonth = currentMonth + delta;
    if (nextMonth > 12) { nextYear += 1; nextMonth = 1; }
    if (nextMonth < 1) { nextYear -= 1; nextMonth = 12; }
    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
  };

  const handleSaveClosedDays = async () => {
    setIsSavingClosedDays(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closedDays }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || '定休日の保存に失敗しました');
      }
      showSuccess('定休日を保存しました');
    } catch (err) {
      showError(err instanceof Error ? err.message : '定休日の保存に失敗しました');
    } finally {
      setIsSavingClosedDays(false);
    }
  };

  const submitDay = async () => {
    if (!selectedDate || !modalType) return;
    setIsSubmitting(true);
    try {
      const endpoint = modalType === 'holiday' ? '/api/admin/holidays' : '/api/admin/special-open-days';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: getDateStr(selectedDate),
          startTime: timeMode === 'timeRange' ? startTime : null,
          endTime: timeMode === 'timeRange' ? endTime : null,
          reason: reason || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || '保存に失敗しました');
      }
      showSuccess(modalType === 'holiday' ? '休日を追加しました' : '特別営業日を追加しました');
      setModalType(null);
      await loadMonthData();
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDay = async () => {
    if (!deleteTarget) return;
    try {
      const base = deleteTarget.kind === 'holiday' ? '/api/admin/holidays' : '/api/admin/special-open-days';
      const response = await fetch(`${base}/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('削除に失敗しました');
      showSuccess(deleteTarget.kind === 'holiday' ? '休日を削除しました' : '特別営業日を削除しました');
      setDeleteTarget(null);
      await loadMonthData();
    } catch (err) {
      showError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const calendarDays = (() => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    for (let i = 0; i < firstDay.getDay(); i += 1) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) days.push(new Date(currentYear, currentMonth - 1, day));
    return days;
  })();

  const findHolidays = (date: Date) => holidays.filter((item) => item.date.slice(0, 10) === getDateStr(date));
  const findSpecialOpenDays = (date: Date) => specialOpenDays.filter((item) => item.date.slice(0, 10) === getDateStr(date));

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto"><div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8">
      <div className="flex items-center gap-4 mb-8"><Link href="/admin" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link><div><p className="text-2xl font-medium flex items-center gap-2"><CalendarOff className="w-6 h-6" />休日設定</p><p className="text-sm text-gray-500 mt-1">定休日、休日、特別営業日を管理します</p></div></div>
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <p className="text-lg font-medium mb-4">定休日</p>
        <div className="flex gap-2 mb-4">{WEEKDAYS.map((day, idx) => <button key={day} onClick={() => setClosedDays((prev) => prev.includes(idx) ? prev.filter((value) => value !== idx) : [...prev, idx].sort())} className={`w-12 h-12 rounded-lg text-sm font-medium ${closedDays.includes(idx) ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{day}</button>)}</div>
        <button onClick={handleSaveClosedDays} disabled={isSavingClosedDays} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"><Check className="w-4 h-4" />{isSavingClosedDays ? '保存中...' : '定休日を保存'}</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6"><p className="text-lg font-medium">休日カレンダー</p><div className="flex items-center gap-2"><button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button><span className="font-medium min-w-[140px] text-center">{currentYear}年{currentMonth}月</span><button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button></div></div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">{WEEKDAYS.map((day, idx) => <div key={day} className={`text-xs py-2 ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>)}</div>
        {isLoadingMonth ? <div className="grid grid-cols-7 gap-1">{Array.from({ length: 35 }).map((_, idx) => <div key={idx} className="aspect-square rounded-lg bg-gray-50 animate-pulse" />)}</div> : <div className="grid grid-cols-7 gap-1">{calendarDays.map((date, idx) => {
          if (!date) return <div key={idx} className="aspect-square" />;
          const dateHolidays = findHolidays(date);
          const dateSpecialOpenDays = findSpecialOpenDays(date);
          const isClosed = isClosedDayOfWeek(date);
          const hasAllDayHoliday = dateHolidays.some((item) => !item.startTime && !item.endTime);
          const hasSpecialOpen = dateSpecialOpenDays.length > 0;
          let bgClass = 'border-gray-100 hover:bg-gray-50';
          if (isClosed && hasSpecialOpen) bgClass = 'bg-green-50 border-green-300';
          else if (isClosed) bgClass = 'bg-red-50 border-red-200';
          else if (hasAllDayHoliday) bgClass = 'bg-red-100 border-red-300';
          else if (dateHolidays.length > 0) bgClass = 'bg-amber-50 border-amber-200';
          return <div key={idx} onClick={() => { setSelectedDate(date); setReason(''); setTimeMode('allDay'); setStartTime('10:00'); setEndTime(isClosed ? '20:00' : '12:00'); setModalType(isClosed ? 'special-open' : 'holiday'); }} className={`aspect-square border rounded-lg p-1 relative cursor-pointer transition-colors ${bgClass} ${isToday(date) ? 'ring-2 ring-blue-400' : ''}`}><span className={`text-xs font-medium ${date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : ''}`}>{date.getDate()}</span>{dateSpecialOpenDays.length > 0 && <div className="absolute bottom-1 left-1 right-1">{dateSpecialOpenDays.map((item) => <div key={item.id} className="flex items-center justify-between"><span className="text-[10px] text-green-600 truncate flex-1">{item.startTime ? `${item.startTime}~` : '終日営業'}</span><button onClick={(event) => { event.stopPropagation(); setDeleteTarget({ kind: 'special-open', id: item.id, label: formatDateLabel(item.date), reason: item.reason }); }} className="p-0.5 text-green-500 hover:text-green-700"><Trash2 className="w-3 h-3" /></button></div>)}</div>}{dateHolidays.length > 0 && dateSpecialOpenDays.length === 0 && <div className="absolute bottom-1 left-1 right-1">{dateHolidays.map((item) => <div key={item.id} className="flex items-center justify-between"><span className="text-[10px] text-red-600 truncate flex-1">{item.startTime ? `${item.startTime}~` : '終日休業'}</span><button onClick={(event) => { event.stopPropagation(); setDeleteTarget({ kind: 'holiday', id: item.id, label: formatDateLabel(item.date), reason: item.reason }); }} className="p-0.5 text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button></div>)}</div>}</div>;
        })}</div>}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500"><div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded" /> 定休日</div><div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-50 border border-green-300 rounded" /> 特別営業日</div><div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded" /> 終日休業</div><div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-50 border border-amber-200 rounded" /> 時間指定休業</div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div><p className="text-sm font-medium mb-3 flex items-center gap-2"><CalendarOff className="w-4 h-4 text-red-500" />{currentMonth}月の休日</p>{holidays.length === 0 ? <p className="text-gray-400 text-xs py-3 text-center bg-gray-50 rounded-lg">休日はありません</p> : <div className="space-y-1.5">{holidays.map((item) => <div key={item.id} className="flex items-center justify-between p-2.5 bg-red-50/50 rounded-lg"><div className="min-w-0 flex-1"><p className="font-medium text-xs sm:text-sm">{formatDateLabel(item.date)}</p><p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">{formatTimeLabel(item.startTime, item.endTime, '終日休業')}</p>{item.reason && <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{item.reason}</p>}</div><button onClick={() => setDeleteTarget({ kind: 'holiday', id: item.id, label: formatDateLabel(item.date), reason: item.reason })} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div>}</div>
          <div><p className="text-sm font-medium mb-3 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-green-500" />{currentMonth}月の特別営業日</p>{specialOpenDays.length === 0 ? <p className="text-gray-400 text-xs py-3 text-center bg-gray-50 rounded-lg">特別営業日はありません</p> : <div className="space-y-1.5">{specialOpenDays.map((item) => <div key={item.id} className="flex items-center justify-between p-2.5 bg-green-50/50 rounded-lg"><div className="min-w-0 flex-1"><p className="font-medium text-xs sm:text-sm">{formatDateLabel(item.date)}</p><p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">{formatTimeLabel(item.startTime, item.endTime, '終日営業')}</p>{item.reason && <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{item.reason}</p>}</div><button onClick={() => setDeleteTarget({ kind: 'special-open', id: item.id, label: formatDateLabel(item.date), reason: item.reason })} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div>}</div>
        </div>
      </div>

      {modalType && selectedDate && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50" onClick={() => setModalType(null)} /><div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6"><button onClick={() => setModalType(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button><p className="text-xl font-medium mb-2">{modalType === 'holiday' ? '休日を追加' : '特別営業日を追加'}</p><p className="text-sm text-gray-500 mb-6">{selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 ({WEEKDAYS[selectedDate.getDay()]})</p><div className="space-y-4"><div><label className="block text-sm text-gray-600 mb-2">種別</label><div className="flex gap-2"><button type="button" onClick={() => setTimeMode('allDay')} className={`flex-1 py-2.5 text-sm rounded-lg ${timeMode === 'allDay' ? modalType === 'holiday' ? 'bg-gray-800 text-white' : 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{modalType === 'holiday' ? '終日休業' : '終日営業'}</button><button type="button" onClick={() => setTimeMode('timeRange')} className={`flex-1 py-2.5 text-sm rounded-lg ${timeMode === 'timeRange' ? modalType === 'holiday' ? 'bg-gray-800 text-white' : 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{modalType === 'holiday' ? '時間指定休業' : '時間指定営業'}</button></div></div>{timeMode === 'timeRange' && <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-gray-600 mb-1">開始</label><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" /></div><div><label className="block text-sm text-gray-600 mb-1">終了</label><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" /></div></div>}<div><label className="block text-sm text-gray-600 mb-1">理由</label><input type="text" value={reason} onChange={(event) => setReason(event.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" placeholder="任意" /></div></div><div className="flex gap-3 pt-6"><button onClick={() => setModalType(null)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button><button onClick={() => void submitDay()} disabled={isSubmitting} className={`flex-1 py-3 text-white rounded-lg disabled:opacity-50 ${modalType === 'holiday' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'}`}><Plus className="w-4 h-4 inline mr-1" />{isSubmitting ? '保存中...' : '保存'}</button></div></div></div>}

      {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} /><div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6"><div className="flex items-center gap-3 mb-4"><div className="p-3 rounded-full bg-red-100 text-red-600"><Trash2 className="w-5 h-5" /></div><p className="text-xl font-medium">削除確認</p></div><p className="text-gray-600 mb-6">{deleteTarget.label} の設定を削除しますか？{deleteTarget.reason && <span className="block mt-1 text-sm text-gray-500">理由: {deleteTarget.reason}</span>}</p><div className="flex gap-3"><button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button><button onClick={() => void deleteDay()} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">削除する</button></div></div></div>}
    </div></div>
  );
}
