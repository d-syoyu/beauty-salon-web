'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { BOOKING_CONFIG } from '@/constants/booking';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface CalendarPickerProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  holidays?: string[];
  specialOpenDays?: string[];
  disabledDates?: string[];
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarPicker({
  selectedDate,
  onSelect,
  currentMonth,
  onMonthChange,
  holidays = [],
  specialOpenDays = [],
  disabledDates = [],
}: CalendarPickerProps) {
  const closedDayOfWeek = BOOKING_CONFIG.closedDayOfWeek;

  // Generate calendar days for the current month view
  const generateCalendarDays = (): (Date | null)[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: (Date | null)[] = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      if (current.getMonth() === month) {
        days.push(new Date(current));
      } else if (current < firstDay) {
        days.push(null); // empty cells before month start
      } else {
        break;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isHoliday = (date: Date): boolean => {
    return holidays.includes(formatDateLocal(date));
  };

  const isExplicitlyDisabled = (date: Date): boolean => {
    return disabledDates.includes(formatDateLocal(date));
  };

  const isSpecialOpenDay = (date: Date): boolean => {
    return specialOpenDays.includes(formatDateLocal(date));
  };

  const isDateSelectable = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cannot select past dates
    if (date < today) return false;

    // Closed day of week (e.g., Monday) - but allow if it's a special open day
    if (date.getDay() === closedDayOfWeek && !isSpecialOpenDay(date)) return false;

    // Holiday
    if (isHoliday(date)) return false;

    // Explicitly disabled
    if (isExplicitlyDisabled(date)) return false;

    // Max advance booking (60 days)
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + BOOKING_CONFIG.bookingAdvanceDays);
    if (date > maxDate) return false;

    return true;
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return selectedDate.toDateString() === date.toDateString();
  };

  const handlePrevMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days = generateCalendarDays();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-[var(--color-light-gray)] p-4 sm:p-6 max-w-sm mx-auto"
    >
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-[var(--color-cream)] transition-colors rounded"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--color-charcoal)]" />
        </button>
        <div className="flex items-center gap-2 text-base font-[family-name:var(--font-serif)]">
          <Calendar className="w-4 h-4 text-[var(--color-sage)]" />
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-[var(--color-cream)] transition-colors rounded"
        >
          <ChevronRight className="w-4 h-4 text-[var(--color-charcoal)]" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-[11px] py-1 font-medium ${
              i === 0
                ? 'text-red-400'
                : i === 6
                  ? 'text-blue-400'
                  : 'text-[var(--color-warm-gray)]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const selectable = isDateSelectable(date);
          const selected = isSelected(date);
          const today = isToday(date);
          const closed = date.getDay() === closedDayOfWeek;
          const holiday = isHoliday(date);

          return (
            <button
              key={`day-${i}`}
              type="button"
              onClick={() => selectable && onSelect(date)}
              disabled={!selectable}
              className={`aspect-square flex items-center justify-center text-xs font-medium transition-all rounded relative ${
                selected
                  ? 'bg-[var(--color-sage)] text-white'
                  : selectable
                    ? `hover:bg-[var(--color-sage-light)]/20 ${
                        today
                          ? 'text-[var(--color-sage)] font-bold'
                          : date.getDay() === 0
                            ? 'text-red-400'
                            : date.getDay() === 6
                              ? 'text-blue-400'
                              : 'text-[var(--color-charcoal)]'
                      }`
                    : 'text-[var(--color-light-gray)] cursor-not-allowed'
              }`}
              title={
                closed
                  ? '定休日'
                  : holiday
                    ? '休業日'
                    : today
                      ? '今日'
                      : undefined
              }
            >
              {date.getDate()}
              {/* Today indicator dot */}
              {today && !selected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-sage)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-[var(--color-light-gray)]">
        <span className="text-[10px] text-[var(--color-warm-gray)]">
          ※{WEEKDAYS[closedDayOfWeek]}曜日は定休日です
        </span>
      </div>
    </motion.div>
  );
}
