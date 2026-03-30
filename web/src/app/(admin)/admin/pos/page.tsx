// src/app/(admin)/admin/pos/page.tsx
// RSC: fetches today/week/month sales stats directly via Prisma

import { prisma } from '@/lib/db';
import PosDashboardClient, { type Sale, type PosStats } from './PosDashboardClient';

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

  const [rawTodaySales, todayAgg, weekAgg, monthAgg] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: todayStart, lte: todayEnd }, paymentStatus: 'PAID' },
      include: {
        items: { select: { itemType: true, menuName: true, productName: true, quantity: true }, orderBy: { orderIndex: 'asc' } },
        user: { select: { name: true } },
      },
      orderBy: [{ saleDate: 'desc' }, { saleTime: 'desc' }],
      take: 10,
    }),
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      where: { saleDate: { gte: todayStart, lte: todayEnd }, paymentStatus: 'PAID' },
    }),
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { saleDate: { gte: weekStart }, paymentStatus: 'PAID' },
    }),
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { saleDate: { gte: monthStart }, paymentStatus: 'PAID' },
    }),
  ]);

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
    todaySales: todayAgg._sum.totalAmount ?? 0,
    todayCount: todayAgg._count ?? 0,
    weekSales: weekAgg._sum.totalAmount ?? 0,
    monthSales: monthAgg._sum.totalAmount ?? 0,
  };

  return <PosDashboardClient todaySales={todaySales} stats={stats} todayLabel={today.label} />;
}
