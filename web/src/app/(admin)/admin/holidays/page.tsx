'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CalendarOff,
  Check,
  AlertTriangle,
  Trash2,
  X,
  Plus,
  CalendarCheck,
} from 'lucide-react';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface Holiday {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
}

interface SpecialOpenDay {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
}

export default function AdminHolidaysPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [specialOpenDays, setSpecialOpenDays] = useState<SpecialOpenDay[]>([]);
  const [closedDays, setClosedDays] = useState<number[]>([1]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingClosedDays, setIsSavingClosedDays] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Holiday modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [reason, setReason] = useState('');
  const [holidayType, setHolidayType] = useState<'allDay' | 'timeRange'>('allDay');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Special open day modal
  const [isSpecialOpenModalOpen, setIsSpecialOpenModalOpen] = useState(false);
  const [isDeleteSpecialOpenModalOpen, setIsDeleteSpecialOpenModalOpen] = useState(false);
  const [deletingSpecialOpenDay, setDeletingSpecialOpenDay] = useState<SpecialOpenDay | null>(null);
  const [specialOpenReason, setSpecialOpenReason] = useState('');
  const [specialOpenType, setSpecialOpenType] = useState<'allDay' | 'timeRange'>('allDay');
  const [specialOpenStartTime, setSpecialOpenStartTime] = useState('10:00');
  const [specialOpenEndTime, setSpecialOpenEndTime] = useState('20:00');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setClosedDays(data.closedDays || [1]);
      }
    } catch (err) { console.error('Settings fetch failed:', err); }
  }, []);

  const fetchHolidays = useCallback(async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await fetch(`/api/admin/holidays?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('休日の取得に失敗しました');
      const data = await res.json();
      setHolidays(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  }, [currentMonth]);

  const fetchSpecialOpenDays = useCallback(async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await fetch(`/api/admin/special-open-days?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setSpecialOpenDays(data);
      }
    } catch (err) { console.error('Special open days fetch failed:', err); }
  }, [currentMonth]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchSettings(), fetchHolidays(), fetchSpecialOpenDays()]);
    setIsLoading(false);
  }, [fetchSettings, fetchHolidays, fetchSpecialOpenDays]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000); };

  const handleSaveClosedDays = async () => {
    setIsSavingClosedDays(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closedDays }),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      showSuccess('定休日を保存しました');
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); } finally { setIsSavingClosedDays(false); }
  };

  const toggleClosedDay = (dayIndex: number) => {
    setClosedDays(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex].sort());
  };

  const generateCalendarDays = (): (Date | null)[] => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    return days;
  };

  const getDateStr = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const getHolidaysForDate = (date: Date) => {
    const dateStr = getDateStr(date);
    return holidays.filter(h => h.date.slice(0, 10) === dateStr);
  };

  const getSpecialOpenDaysForDate = (date: Date) => {
    const dateStr = getDateStr(date);
    return specialOpenDays.filter(s => s.date.slice(0, 10) === dateStr);
  };

  const isClosedDayOfWeek = (date: Date) => closedDays.includes(date.getDay());

  // Click handler: closed day → special open modal, normal day → holiday modal
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (isClosedDayOfWeek(date)) {
      setSpecialOpenReason('');
      setSpecialOpenType('allDay');
      setSpecialOpenStartTime('10:00');
      setSpecialOpenEndTime('20:00');
      setIsSpecialOpenModalOpen(true);
    } else {
      setReason('');
      setHolidayType('allDay');
      setStartTime('10:00');
      setEndTime('12:00');
      setIsAddModalOpen(true);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    setIsSubmitting(true);
    try {
      const dateStr = getDateStr(selectedDate);
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          startTime: holidayType === 'timeRange' ? startTime : null,
          endTime: holidayType === 'timeRange' ? endTime : null,
          reason: reason || null,
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '登録に失敗しました'); }
      showSuccess('不定休を登録しました');
      setIsAddModalOpen(false);
      fetchHolidays();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); } finally { setIsSubmitting(false); }
  };

  const handleAddSpecialOpenDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    setIsSubmitting(true);
    try {
      const dateStr = getDateStr(selectedDate);
      const res = await fetch('/api/admin/special-open-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          startTime: specialOpenType === 'timeRange' ? specialOpenStartTime : null,
          endTime: specialOpenType === 'timeRange' ? specialOpenEndTime : null,
          reason: specialOpenReason || null,
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '登録に失敗しました'); }
      showSuccess('臨時営業日を登録しました');
      setIsSpecialOpenModalOpen(false);
      fetchSpecialOpenDays();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteHoliday = async () => {
    if (!deletingHoliday) return;
    try {
      const res = await fetch(`/api/admin/holidays/${deletingHoliday.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      showSuccess('不定休を削除しました');
      setIsDeleteModalOpen(false);
      setDeletingHoliday(null);
      fetchHolidays();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  const handleDeleteSpecialOpenDay = async () => {
    if (!deletingSpecialOpenDay) return;
    try {
      const res = await fetch(`/api/admin/special-open-days/${deletingSpecialOpenDay.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      showSuccess('臨時営業日を削除しました');
      setIsDeleteSpecialOpenModalOpen(false);
      setDeletingSpecialOpenDay(null);
      fetchSpecialOpenDays();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium flex items-center gap-2">
              <CalendarOff className="w-6 h-6" /> 営業管理
            </h1>
            <p className="text-sm text-gray-500 mt-1">定休日・不定休・臨時営業の設定</p>
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">{success}</div>}

        {/* Closed Days of Week */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">定休日（曜日）</h2>
          <div className="flex gap-2 mb-4">
            {WEEKDAYS.map((day, idx) => (
              <button
                key={idx}
                onClick={() => toggleClosedDay(idx)}
                className={`w-12 h-12 rounded-lg text-sm font-medium transition-colors ${
                  closedDays.includes(idx) ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <button
            onClick={handleSaveClosedDays}
            disabled={isSavingClosedDays}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isSavingClosedDays ? '保存中...' : '定休日を保存'}
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">営業カレンダー</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <span className="font-medium min-w-[140px] text-center">{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月</span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-500">読み込み中...</div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {WEEKDAYS.map((day, idx) => (
                  <div key={day} className={`text-xs py-2 ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((date, i) => {
                  if (!date) return <div key={i} className="aspect-square" />;

                  const dateHolidays = getHolidaysForDate(date);
                  const dateSpecialOpenDays = getSpecialOpenDaysForDate(date);
                  const isClosed = isClosedDayOfWeek(date);
                  const hasHoliday = dateHolidays.length > 0;
                  const hasSpecialOpen = dateSpecialOpenDays.length > 0;
                  const hasAllDayHoliday = dateHolidays.some(h => !h.startTime && !h.endTime);
                  const hasAllDaySpecialOpen = dateSpecialOpenDays.some(s => !s.startTime && !s.endTime);
                  const dayOfWeek = date.getDay();

                  let bgClass = 'border-gray-100 hover:bg-gray-50';
                  if (isClosed && hasAllDaySpecialOpen) {
                    bgClass = 'bg-green-50 border-green-300';
                  } else if (isClosed && hasSpecialOpen) {
                    bgClass = 'bg-green-50 border-green-200';
                  } else if (isClosed) {
                    bgClass = 'bg-red-50 border-red-200';
                  } else if (hasAllDayHoliday) {
                    bgClass = 'bg-red-100 border-red-300';
                  } else if (hasHoliday) {
                    bgClass = 'bg-amber-50 border-amber-200';
                  }

                  return (
                    <div
                      key={i}
                      className={`aspect-square border rounded-lg p-1 relative cursor-pointer transition-colors ${bgClass} ${isToday(date) ? 'ring-2 ring-blue-400' : ''}`}
                      onClick={() => handleDateClick(date)}
                    >
                      <span className={`text-xs font-medium ${
                        dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''
                      }`}>
                        {date.getDate()}
                      </span>
                      {hasSpecialOpen && (
                        <div className="absolute bottom-1 left-1 right-1">
                          {dateSpecialOpenDays.map((s) => (
                            <div key={s.id} className="flex items-center justify-between">
                              <span className="text-[10px] text-green-600 truncate flex-1">
                                {s.startTime ? `${s.startTime}~` : '臨時営業'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeletingSpecialOpenDay(s); setIsDeleteSpecialOpenModalOpen(true); }}
                                className="p-0.5 text-green-400 hover:text-green-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {hasHoliday && !hasSpecialOpen && (
                        <div className="absolute bottom-1 left-1 right-1">
                          {dateHolidays.map((h) => (
                            <div key={h.id} className="flex items-center justify-between">
                              <span className="text-[10px] text-red-600 truncate flex-1">
                                {h.startTime ? `${h.startTime}~` : '終日'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeletingHoliday(h); setIsDeleteModalOpen(true); }}
                                className="p-0.5 text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded" /> 定休日</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-50 border border-green-300 rounded" /> 臨時営業</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded" /> 終日休業</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-50 border border-amber-200 rounded" /> 時間帯休業</div>
              </div>

              {/* Monthly lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                {/* 不定休 list */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 text-red-500" />
                    {currentMonth.getMonth() + 1}月の不定休
                  </h3>
                  {holidays.length === 0 ? (
                    <p className="text-gray-400 text-xs py-3 text-center bg-gray-50 rounded-lg">不定休はありません</p>
                  ) : (
                    <div className="space-y-1.5">
                      {holidays.map((holiday) => (
                        <div key={holiday.id} className="flex items-center justify-between p-2.5 bg-red-50/50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm">{formatDisplayDate(holiday.date)}</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                              {holiday.startTime && holiday.endTime ? `${holiday.startTime}〜${holiday.endTime}` : '終日休業'}
                            </p>
                            {holiday.reason && (
                              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{holiday.reason}</p>
                            )}
                          </div>
                          <button
                            onClick={() => { setDeletingHoliday(holiday); setIsDeleteModalOpen(true); }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 ml-2"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 特別営業日 list */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-green-500" />
                    {currentMonth.getMonth() + 1}月の特別営業日
                  </h3>
                  {specialOpenDays.length === 0 ? (
                    <p className="text-gray-400 text-xs py-3 text-center bg-gray-50 rounded-lg">特別営業日はありません</p>
                  ) : (
                    <div className="space-y-1.5">
                      {specialOpenDays.map((day) => (
                        <div key={day.id} className="flex items-center justify-between p-2.5 bg-green-50/50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm">{formatDisplayDate(day.date)}</p>
                            <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                              {day.startTime && day.endTime ? `${day.startTime}〜${day.endTime}` : '終日営業'}
                            </p>
                            {day.reason && (
                              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{day.reason}</p>
                            )}
                          </div>
                          <button
                            onClick={() => { setDeletingSpecialOpenDay(day); setIsDeleteSpecialOpenModalOpen(true); }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 ml-2"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isAddModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-2">不定休を追加</h3>
            <p className="text-sm text-gray-500 mb-6">
              {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日（{WEEKDAYS[selectedDate.getDay()]}）
            </p>
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">休業タイプ</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setHolidayType('allDay')} className={`flex-1 py-2.5 text-sm rounded-lg transition-colors ${holidayType === 'allDay' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>終日休業</button>
                  <button type="button" onClick={() => setHolidayType('timeRange')} className={`flex-1 py-2.5 text-sm rounded-lg transition-colors ${holidayType === 'timeRange' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>時間帯休業</button>
                </div>
              </div>
              {holidayType === 'timeRange' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">開始時間</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">終了時間</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-600 mb-1">理由（任意）</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例: 臨時休業" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
                  <Plus className="w-4 h-4 inline mr-1" />{isSubmitting ? '登録中...' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Special Open Day Modal */}
      {isSpecialOpenModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSpecialOpenModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <button onClick={() => setIsSpecialOpenModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-5 h-5 text-green-600" />
              <h3 className="text-xl font-medium">臨時営業を設定</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日（{WEEKDAYS[selectedDate.getDay()]}）
              <span className="ml-2 text-red-500">※ 定休日</span>
            </p>
            <form onSubmit={handleAddSpecialOpenDay} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">営業タイプ</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSpecialOpenType('allDay')} className={`flex-1 py-2.5 text-sm rounded-lg transition-colors ${specialOpenType === 'allDay' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>終日営業</button>
                  <button type="button" onClick={() => setSpecialOpenType('timeRange')} className={`flex-1 py-2.5 text-sm rounded-lg transition-colors ${specialOpenType === 'timeRange' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>時間帯営業</button>
                </div>
              </div>
              {specialOpenType === 'timeRange' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">開始時間</label>
                    <input type="time" value={specialOpenStartTime} onChange={(e) => setSpecialOpenStartTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">終了時間</label>
                    <input type="time" value={specialOpenEndTime} onChange={(e) => setSpecialOpenEndTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-600 mb-1">理由（任意）</label>
                <input type="text" value={specialOpenReason} onChange={(e) => setSpecialOpenReason(e.target.value)} placeholder="例: 年末特別営業" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsSpecialOpenModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  <CalendarCheck className="w-4 h-4 inline mr-1" />{isSubmitting ? '登録中...' : '臨時営業を登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Holiday Modal */}
      {isDeleteModalOpen && deletingHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-xl font-medium">不定休の削除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {deletingHoliday.date.slice(0, 10)}の不定休を削除しますか？
              {deletingHoliday.reason && <span className="block mt-1 text-sm text-gray-500">理由: {deletingHoliday.reason}</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDeleteHoliday} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Special Open Day Modal */}
      {isDeleteSpecialOpenModalOpen && deletingSpecialOpenDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDeleteSpecialOpenModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-amber-100 text-amber-600"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-xl font-medium">臨時営業日の削除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {deletingSpecialOpenDay.date.slice(0, 10)}の臨時営業設定を削除しますか？
              {deletingSpecialOpenDay.reason && <span className="block mt-1 text-sm text-gray-500">理由: {deletingSpecialOpenDay.reason}</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteSpecialOpenModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDeleteSpecialOpenDay} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
