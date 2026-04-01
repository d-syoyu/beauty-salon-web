import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import { measureAdminTask, startAdminTimer } from '@/lib/admin-performance';
import HolidaysClient from './HolidaysClient';

function getJstNow(): { year: number; month: number } {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1 };
}

function HolidaysPageFallback() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-72 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="rounded-xl bg-white shadow-sm p-6 space-y-4">
          <div className="h-6 w-32 rounded bg-gray-100 animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-12 w-12 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-6 grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="aspect-square rounded-lg bg-gray-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function HolidaysPageContent({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const jstNow = getJstNow();
  const year = parseInt(yearParam || '', 10) || jstNow.year;
  const month = parseInt(monthParam || '', 10) || jstNow.month;

  const settingsRow = await measureAdminTask('holidays.closed-days', () =>
    prisma.settings.findUnique({ where: { key: 'closed_days' } }),
  );

  const closedDays: number[] = settingsRow ? JSON.parse(settingsRow.value) : [1];

  return <HolidaysClient year={year} month={month} initialClosedDays={closedDays} />;
}

export default async function AdminHolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const end = startAdminTimer('holidays.page.total');

  try {
    return (
      <Suspense fallback={<HolidaysPageFallback />}>
        <HolidaysPageContent searchParams={searchParams} />
      </Suspense>
    );
  } finally {
    end();
  }
}
