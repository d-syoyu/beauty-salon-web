// constants/salon.ts
// LUMINA HAIR STUDIO - 店舗情報

import HolidayJp from "@holiday-jp/holiday_jp";

export const SALON_INFO = {
  name: "LUMINA HAIR STUDIO",
  address: "〒150-0001 東京都渋谷区神宮前1-2-3",
  phone: "03-1234-5678",
  email: "info@lumina-hair.jp",
  hours: {
    weekday: {
      open: "10:00",
      lastBooking: "19:00",
      close: "20:00",
    },
    weekend: {
      open: "09:00",
      lastBooking: "18:00",
      close: "19:00",
    },
  },
  closedDay: 1,
  closedDayName: "月曜日",
} as const;

export const isWeekendOrHoliday = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }
  return HolidayJp.isHoliday(date);
};

export const getBusinessHours = (date: Date) => {
  return isWeekendOrHoliday(date)
    ? SALON_INFO.hours.weekend
    : SALON_INFO.hours.weekday;
};

export const isWeekend = (dayOfWeek: number): boolean => {
  return dayOfWeek === 0 || dayOfWeek === 6;
};

export const BUSINESS_HOURS = {
  open: SALON_INFO.hours.weekday.open,
  close: SALON_INFO.hours.weekday.close,
};
export const CLOSED_DAY = SALON_INFO.closedDay;
