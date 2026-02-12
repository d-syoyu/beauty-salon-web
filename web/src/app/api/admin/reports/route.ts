// src/app/api/admin/reports/route.ts
// Admin Reports API - Sales analytics

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "month"; // day, week, month
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate + "T00:00:00");
      end = new Date(endDate + "T23:59:59.999");
    } else if (period === "day") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === "week") {
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday, 0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const [salesData, reservationData, paymentMethodData] = await Promise.all([
      // Total sales
      prisma.sale.aggregate({
        _sum: { totalAmount: true, taxAmount: true, discountAmount: true, couponDiscount: true },
        _count: true,
        _avg: { totalAmount: true },
        where: {
          saleDate: { gte: start, lte: end },
          paymentStatus: "PAID",
        },
      }),
      // Reservation stats
      prisma.reservation.groupBy({
        by: ["status"],
        _count: true,
        where: {
          date: { gte: start, lte: end },
        },
      }),
      // Sales by payment method
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        _sum: { totalAmount: true },
        _count: true,
        where: {
          saleDate: { gte: start, lte: end },
          paymentStatus: "PAID",
        },
      }),
    ]);

    // Category sales
    const categoryData = await prisma.saleItem.groupBy({
      by: ["category"],
      _sum: { subtotal: true },
      _count: true,
      where: {
        sale: {
          saleDate: { gte: start, lte: end },
          paymentStatus: "PAID",
        },
        category: { not: null },
      },
    });

    return NextResponse.json({
      period: { start: start.toISOString(), end: end.toISOString() },
      sales: {
        total: salesData._sum.totalAmount || 0,
        count: salesData._count || 0,
        average: Math.round(salesData._avg.totalAmount || 0),
        tax: salesData._sum.taxAmount || 0,
        discount: salesData._sum.discountAmount || 0,
        couponDiscount: salesData._sum.couponDiscount || 0,
      },
      reservations: reservationData.map((r) => ({
        status: r.status,
        count: r._count,
      })),
      paymentMethods: paymentMethodData.map((p) => ({
        method: p.paymentMethod,
        total: p._sum.totalAmount || 0,
        count: p._count,
      })),
      categories: categoryData.map((c) => ({
        category: c.category,
        total: c._sum.subtotal || 0,
        count: c._count,
      })),
    });
  } catch (err) {
    console.error("Reports error:", err);
    return NextResponse.json({ error: "レポートの取得に失敗しました" }, { status: 500 });
  }
}
