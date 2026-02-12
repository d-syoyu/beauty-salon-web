// src/app/api/admin/analytics/route.ts
// Admin Analytics API - Dashboard stats

import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Week start (Monday)
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() + daysToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Month range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [todayCount, weekCount, totalReservations, todaySales, weekSales, monthSales] =
      await Promise.all([
        prisma.reservation.count({
          where: {
            date: { gte: todayStart, lte: todayEnd },
            status: { not: "CANCELLED" },
          },
        }),
        prisma.reservation.count({
          where: {
            date: { gte: weekStart, lte: weekEnd },
            status: { not: "CANCELLED" },
          },
        }),
        prisma.reservation.count({
          where: { status: { not: "CANCELLED" } },
        }),
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          _count: true,
          where: {
            saleDate: { gte: todayStart, lte: todayEnd },
            paymentStatus: "PAID",
          },
        }),
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: {
            saleDate: { gte: weekStart, lte: weekEnd },
            paymentStatus: "PAID",
          },
        }),
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: {
            saleDate: { gte: monthStart, lte: monthEnd },
            paymentStatus: "PAID",
          },
        }),
      ]);

    const weekStartStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    const weekEndStr = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

    return NextResponse.json({
      todayCount,
      weekCount,
      totalReservations,
      weekStartStr,
      weekEndStr,
      sales: {
        today: todaySales._sum.totalAmount || 0,
        todayCount: todaySales._count || 0,
        week: weekSales._sum.totalAmount || 0,
        month: monthSales._sum.totalAmount || 0,
      },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "統計情報の取得に失敗しました" }, { status: 500 });
  }
}
