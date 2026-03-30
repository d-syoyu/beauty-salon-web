// src/app/(admin)/admin/page.tsx
// RSC: fetches today's reservations, analytics, and holidays via Prisma

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import DashboardClient, {
  type Reservation,
  type DashboardStats,
  type Holiday,
} from './DashboardClient';

function getJstToday() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const dow = jst.getUTCDay();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const str = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const label = `${year}年${month}月${day}日（${weekdays[dow]}）`;
  return { year, month, day, str, label };
}

export default async function AdminDashboard() {
  const today = getJstToday();

  const todayStart = new Date(today.year, today.month - 1, today.day, 0, 0, 0, 0);
  const todayEnd = new Date(today.year, today.month - 1, today.day, 23, 59, 59, 999);
  const monthStart = new Date(today.year, today.month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(today.year, today.month, 0, 23, 59, 59, 999);

  // Week start (Monday)
  const todayDate = new Date(today.year, today.month - 1, today.day);
  const dow = todayDate.getDay();
  const daysToMonday = dow === 0 ? -6 : -(dow - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() + daysToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [rawReservations, todayCount, weekCount, totalReservations, rawHolidays] =
    await Promise.all([
      prisma.reservation.findMany({
        where: { date: { gte: todayStart, lte: todayEnd }, status: 'CONFIRMED' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: { orderBy: { orderIndex: 'asc' } },
          staff: { select: { id: true, name: true, image: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.reservation.count({
        where: { date: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELLED' } },
      }),
      prisma.reservation.count({
        where: { date: { gte: weekStart, lte: weekEnd }, status: { not: 'CANCELLED' } },
      }),
      prisma.reservation.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.holiday.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        orderBy: { date: 'asc' },
      }),
    ]);

  // Serialize for client props
  const reservations: Reservation[] = rawReservations.map((r) => ({
    id: r.id,
    totalPrice: r.totalPrice,
    totalDuration: r.totalDuration,
    menuSummary: r.menuSummary,
    date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status,
    staffId: r.staffId,
    staffName: r.staffName,
    user: r.user,
    staff: r.staff,
    items: r.items,
  }));

  const todayHolidays: Holiday[] = rawHolidays
    .filter((h) => {
      const d = h.date instanceof Date ? h.date.toISOString().slice(0, 10) : String(h.date).slice(0, 10);
      return d === today.str;
    })
    .map((h) => ({
      id: h.id,
      date: h.date instanceof Date ? h.date.toISOString() : String(h.date),
      startTime: h.startTime,
      endTime: h.endTime,
      reason: h.reason,
    }));

  const weekStartStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
  const weekEndStr = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

  const stats: DashboardStats = {
    todayCount,
    weekCount,
    totalReservations,
    weekStartStr,
    weekEndStr,
  };

  return (
    <DashboardClient
      initialReservations={reservations}
      stats={stats}
      todayHolidays={todayHolidays}
      todayLabel={today.label}
      todayStr={today.str}
    />
  );
}
