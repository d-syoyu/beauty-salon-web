// src/app/(admin)/admin/pos/page.tsx
// RSC: fetches today/week/month sales stats directly via Prisma

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import PosDashboardClient, { type Sale, type PosStats } from './PosDashboardClient';

type RawPosStatsRow = {
  todaySales: bigint | number | null;
  todayCount: bigint | number;
  weekSales: bigint | number | null;
  monthSales: bigint | number | null;
};

/** Get current date string in JST (UTC+9) */
function getJstToday(): { year: number; month: number; day: number; label: string } {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const dow = jst.getUTCDay();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return { year, month, day, label: `${year}年${month}月${day}日（${weekdays[dow]}）` };
}

export default async function POSDashboard() {
  const today = getJstToday();

  const todayStart = new Date(today.year, today.month - 1, today.day, 0, 0, 0, 0);
  const todayEnd = new Date(today.year, today.month - 1, today.day, 23, 59, 59, 999);

  // Week start (Monday)
  const todayDate = new Date(today.year, today.month - 1, today.day);
  const dow = todayDate.getDay();
  const daysToMonday = dow === 0 ? -6 : -(dow - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() + daysToMonday);

  const monthStart = new Date(today.year, today.month - 1, 1, 0, 0, 0, 0);

  const rawTodaySalesPromise = prisma.sale.findMany({
      where: { saleDate: { gte: todayStart, lte: todayEnd }, paymentStatus: 'PAID' },
      select: {
        id: true,
        saleNumber: true,
        customerName: true,
        saleDate: true,
        saleTime: true,
        totalAmount: true,
        paymentMethod: true,
        items: {
          select: { itemType: true, menuName: true, productName: true, quantity: true },
          orderBy: { orderIndex: 'asc' },
        },
        user: { select: { name: true } },
      },
      orderBy: [{ saleDate: 'desc' }, { saleTime: 'desc' }],
      take: 10,
    });

  const statsPromise = prisma.$queryRaw<RawPosStatsRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM("totalAmount") FILTER (
        WHERE "saleDate" >= ${todayStart}
          AND "saleDate" <= ${todayEnd}
      ), 0) AS "todaySales",
      COUNT(*) FILTER (
        WHERE "saleDate" >= ${todayStart}
          AND "saleDate" <= ${todayEnd}
      ) AS "todayCount",
      COALESCE(SUM("totalAmount") FILTER (
        WHERE "saleDate" >= ${weekStart}
      ), 0) AS "weekSales",
      COALESCE(SUM("totalAmount") FILTER (
        WHERE "saleDate" >= ${monthStart}
      ), 0) AS "monthSales"
    FROM "Sale"
    WHERE "paymentStatus" = 'PAID'
  `);

  const [rawTodaySales, rawStats] = await Promise.all([
    rawTodaySalesPromise,
    statsPromise,
  ]);

  const statsRow = rawStats[0] ?? {
    todaySales: 0,
    todayCount: 0,
    weekSales: 0,
    monthSales: 0,
  };

  // Serialize dates for client props
  const todaySales: Sale[] = rawTodaySales.map((s) => ({
    id: s.id,
    saleNumber: s.saleNumber,
    customerName: s.customerName,
    saleDate: s.saleDate instanceof Date ? s.saleDate.toISOString() : String(s.saleDate),
    saleTime: s.saleTime,
    totalAmount: s.totalAmount,
    paymentMethod: s.paymentMethod,
    items: s.items as Sale['items'],
    user: s.user,
  }));

  const stats: PosStats = {
    todaySales: Number(statsRow.todaySales ?? 0),
    todayCount: Number(statsRow.todayCount ?? 0),
    weekSales: Number(statsRow.weekSales ?? 0),
    monthSales: Number(statsRow.monthSales ?? 0),
  };

  return <PosDashboardClient todaySales={todaySales} stats={stats} todayLabel={today.label} />;
}
