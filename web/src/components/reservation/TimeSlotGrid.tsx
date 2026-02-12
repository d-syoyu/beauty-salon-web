'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

export interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  isLoading?: boolean;
  selectedDate?: Date | null;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function TimeSlotGrid({
  slots,
  selectedTime,
  onSelect,
  isLoading = false,
  selectedDate,
}: TimeSlotGridProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-light-gray)] p-6 text-center"
      >
        <div className="inline-block w-6 h-6 border-2 border-[var(--color-sage)] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-[var(--color-warm-gray)]">空き状況を確認中...</p>
      </motion.div>
    );
  }

  if (slots.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-light-gray)] p-6 text-center"
      >
        <p className="text-sm text-[var(--color-warm-gray)]">
          この日は予約可能な時間帯がありません。<br />
          他の日付をお選びください。
        </p>
      </motion.div>
    );
  }

  // Group slots by hour
  const slotsByHour: Record<string, TimeSlot[]> = {};
  slots.forEach((slot) => {
    const hour = slot.time.split(':')[0];
    if (!slotsByHour[hour]) {
      slotsByHour[hour] = [];
    }
    slotsByHour[hour].push(slot);
  });

  const sortedEntries = Object.entries(slotsByHour).sort(
    ([a], [b]) => parseInt(a) - parseInt(b)
  );

  const availableCount = slots.filter((s) => s.available).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-[var(--color-light-gray)] p-4 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-base font-[family-name:var(--font-serif)]">
          <Clock className="w-4 h-4 text-[var(--color-sage)]" />
          {selectedDate && (
            <span>
              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
              （{WEEKDAYS[selectedDate.getDay()]}）
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--color-warm-gray)]">
          {availableCount}枠
        </span>
      </div>

      {/* Slots by hour */}
      <div className="space-y-3">
        {sortedEntries.map(([hour, hourSlots]) => (
          <div key={hour} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <span className="text-xs text-[var(--color-warm-gray)] font-medium sm:w-10 flex-shrink-0">
              {parseInt(hour)}時
            </span>
            <div className="grid grid-cols-6 gap-1.5 flex-1">
              {hourSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => slot.available && onSelect(slot.time)}
                  disabled={!slot.available}
                  className={`py-2 text-xs sm:text-sm font-medium border transition-all ${
                    selectedTime === slot.time
                      ? 'bg-[var(--color-sage)] text-white border-[var(--color-sage)]'
                      : slot.available
                        ? 'border-[var(--color-light-gray)] text-[var(--color-charcoal)] hover:border-[var(--color-sage)] hover:bg-[var(--color-sage)]/5'
                        : 'border-[var(--color-cream-dark)] bg-[var(--color-cream-dark)] text-[var(--color-light-gray)] cursor-not-allowed'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--color-light-gray)]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 border border-[var(--color-light-gray)]" />
          <span className="text-[10px] text-[var(--color-warm-gray)]">予約可</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-[var(--color-cream-dark)]" />
          <span className="text-[10px] text-[var(--color-warm-gray)]">予約不可</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-[var(--color-sage)]" />
          <span className="text-[10px] text-[var(--color-warm-gray)]">選択中</span>
        </div>
      </div>
    </motion.div>
  );
}
