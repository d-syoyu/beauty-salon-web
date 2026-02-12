// src/lib/date-utils.ts

/**
 * Parse a YYYY-MM-DD string to a Date at noon local time.
 * Using noon prevents timezone offset from shifting the calendar date.
 * JST noon (12:00) = UTC 03:00 → same calendar date in both timezones.
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function parseLocalDateStart(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function parseLocalDateEnd(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/**
 * Format a Date object to YYYY-MM-DD using local timezone.
 * Use this instead of .toISOString().slice(0, 10) which returns the UTC date.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
