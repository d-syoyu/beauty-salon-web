// constants/booking.ts
// LUMINA - 予約システム設定

export const BOOKING_CONFIG = {
  openTime: "09:00",
  closeTime: "20:00",
  slotInterval: 10,
  maxConcurrentBookings: 1,
  cancelDeadline: {
    daysBefore: 1,
    time: "19:00",
  },
  closedDayOfWeek: 1,
  bookingAdvanceDays: 60,
} as const;

export const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  const [openHour, openMinute] = BOOKING_CONFIG.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = BOOKING_CONFIG.closeTime.split(":").map(Number);

  let currentHour = openHour;
  let currentMinute = openMinute;

  while (
    currentHour < closeHour ||
    (currentHour === closeHour && currentMinute < closeMinute)
  ) {
    const timeString = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
    slots.push(timeString);

    currentMinute += BOOKING_CONFIG.slotInterval;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }

  return slots;
};

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
};

export const isClosedDay = (date: Date): boolean => {
  return date.getDay() === BOOKING_CONFIG.closedDayOfWeek;
};

export const canCancel = (reservationDate: Date): boolean => {
  const now = new Date();
  const deadline = new Date(reservationDate);
  deadline.setDate(deadline.getDate() - BOOKING_CONFIG.cancelDeadline.daysBefore);

  const [deadlineHour, deadlineMinute] = BOOKING_CONFIG.cancelDeadline.time.split(":").map(Number);
  deadline.setHours(deadlineHour, deadlineMinute, 0, 0);

  return now < deadline;
};

export const isBookableDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate < today) return false;
  if (isClosedDay(targetDate)) return false;

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + BOOKING_CONFIG.bookingAdvanceDays);
  if (targetDate > maxDate) return false;

  return true;
};

export const TIME_SLOTS = generateTimeSlots();
export const isWithinBookingWindow = isBookableDate;
export const canCancelReservation = canCancel;
