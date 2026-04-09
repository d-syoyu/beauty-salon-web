export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import { reservationDedupDistinct } from '@/lib/reservation-dedup';
import { measureAdminTask, startAdminTimer } from '@/lib/admin-performance';
import { getAdminShopContext } from '@/lib/admin-shop';
import DashboardClient, {
  type DashboardStats,
  type Holiday,
  type Reservation,
} from './DashboardClient';

function getJstToday() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const str = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, str, label: `${str} (${weekday})` };
}

function DashboardFallback() {
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-28 animate-pulse rounded-xl border border-border bg-muted/30" />
        <div className="h-28 animate-pulse rounded-xl border border-border bg-muted/30" />
        <div className="h-28 animate-pulse rounded-xl border border-border bg-muted/30" />
      </div>
      <div className="h-96 animate-pulse rounded-xl border border-border bg-muted/30" />
    </div>
  );
}

async function DashboardContent() {
  const endContentTimer = startAdminTimer('dashboard.content.total');

  try {
    const today = getJstToday();
    const { selectedShopId } = await getAdminShopContext(prisma);

    const todayStart = new Date(today.year, today.month - 1, today.day, 0, 0, 0, 0);
    const todayEnd = new Date(today.year, today.month - 1, today.day, 23, 59, 59, 999);
    const monthStart = new Date(today.year, today.month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(today.year, today.month, 0, 23, 59, 59, 999);

    const todayDate = new Date(today.year, today.month - 1, today.day);
    const dayOfWeek = todayDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() + daysToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const shopWhere = selectedShopId ? { shopId: selectedShopId } : {};

    const [rawReservations, todayCount, weekCount, totalReservations, rawHolidays, categories] =
      await Promise.all([
        measureAdminTask('dashboard.query.today-reservations', () =>
          prisma.reservation.findMany({
            where: {
              ...shopWhere,
              date: { gte: todayStart, lte: todayEnd },
              status: { in: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
            },
            distinct: reservationDedupDistinct,
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              items: { orderBy: { orderIndex: 'asc' } },
              staff: { select: { id: true, name: true, image: true } },
            },
            orderBy: { startTime: 'asc' },
          }),
        ),
        measureAdminTask('dashboard.query.today-count', () =>
          prisma.reservation.count({
            where: {
              ...shopWhere,
              date: { gte: todayStart, lte: todayEnd },
              status: { not: 'CANCELLED' },
            },
          }),
        ),
        measureAdminTask('dashboard.query.week-count', () =>
          prisma.reservation.count({
            where: {
              ...shopWhere,
              date: { gte: weekStart, lte: weekEnd },
              status: { not: 'CANCELLED' },
            },
          }),
        ),
        measureAdminTask('dashboard.query.total-count', () =>
          prisma.reservation.count({
            where: { ...shopWhere, status: { not: 'CANCELLED' } },
          }),
        ),
        measureAdminTask('dashboard.query.holidays', () =>
          prisma.holiday.findMany({
            where: { ...shopWhere, date: { gte: monthStart, lte: monthEnd } },
            orderBy: { date: 'asc' },
          }),
        ),
        prisma.category.findMany({
          where: { isActive: true },
          select: { name: true, color: true },
        }),
      ]);

    const reservations: Reservation[] = rawReservations.map((reservation) => ({
      id: reservation.id,
      totalPrice: reservation.totalPrice,
      totalDuration: reservation.totalDuration,
      menuSummary: reservation.menuSummary,
      date:
        reservation.date instanceof Date
          ? reservation.date.toISOString()
          : String(reservation.date),
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      status: reservation.status,
      staffId: reservation.staffId,
      staffName: reservation.staffName,
      user: reservation.user,
      staff: reservation.staff,
      items: reservation.items,
    }));

    const todayHolidays: Holiday[] = rawHolidays
      .filter((holiday) => {
        const value =
          holiday.date instanceof Date
            ? holiday.date.toISOString().slice(0, 10)
            : String(holiday.date).slice(0, 10);
        return value === today.str;
      })
      .map((holiday) => ({
        id: holiday.id,
        date:
          holiday.date instanceof Date
            ? holiday.date.toISOString()
            : String(holiday.date),
        startTime: holiday.startTime,
        endTime: holiday.endTime,
        reason: holiday.reason,
      }));

    const stats: DashboardStats = {
      todayCount,
      weekCount,
      totalReservations,
      weekStartStr: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      weekEndStr: `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
    };

    const categoryColors = Object.fromEntries(
      categories.map((category) => [category.name, category.color]),
    );

    return (
      <DashboardClient
        initialReservations={reservations}
        stats={stats}
        todayHolidays={todayHolidays}
        todayLabel={today.label}
        todayStr={today.str}
        categoryColors={categoryColors}
      />
    );
  } finally {
    endContentTimer();
  }
}

export default async function AdminDashboard() {
  const endPageTimer = startAdminTimer('dashboard.page.total');

  try {
    return (
      <Suspense fallback={<DashboardFallback />}>
        <DashboardContent />
      </Suspense>
    );
  } finally {
    endPageTimer();
  }
}
