// src/app/(admin)/admin/holidays/page.tsx
// RSC: fetches holidays, special open days, and settings for the given month via Prisma

import { prisma } from '@/lib/db';
import HolidaysClient, { type Holiday, type SpecialOpenDay } from './HolidaysClient';

function getJstNow(): { year: number; month: number } {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1 };
}

export default async function AdminHolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const jstNow = getJstNow();
  const year = parseInt(yearParam || '') || jstNow.year;
  const month = parseInt(monthParam || '') || jstNow.month;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [rawHolidays, rawSpecialOpenDays, settingsRow] = await Promise.all([
    prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
    prisma.specialOpenDay.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
    prisma.settings.findUnique({ where: { key: 'closedDays' } }),
  ]);

  const closedDays: number[] = settingsRow ? JSON.parse(settingsRow.value) : [1];

  const holidays: Holiday[] = rawHolidays.map((h) => ({
    id: h.id,
    date: h.date instanceof Date ? h.date.toISOString() : String(h.date),
    startTime: h.startTime,
    endTime: h.endTime,
    reason: h.reason,
    createdAt: h.createdAt instanceof Date ? h.createdAt.toISOString() : String(h.createdAt),
  }));

  const specialOpenDays: SpecialOpenDay[] = rawSpecialOpenDays.map((s) => ({
    id: s.id,
    date: s.date instanceof Date ? s.date.toISOString() : String(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    reason: s.reason,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
  }));

  return (
    <HolidaysClient
      key={`${year}-${month}`}
      year={year}
      month={month}
      initialHolidays={holidays}
      initialSpecialOpenDays={specialOpenDays}
      initialClosedDays={closedDays}
    />
  );
}
