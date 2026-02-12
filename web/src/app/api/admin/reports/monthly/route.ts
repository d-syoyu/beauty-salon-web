// src/app/api/admin/reports/monthly/route.ts
// LUMINA HAIR STUDIO - Monthly Sales Report API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAdminAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { error } = await checkAdminAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const now = new Date();
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const prevStartDate = new Date(year, month - 2, 1);
    const prevEndDate = new Date(year, month - 1, 1);

    const [sales, prevSales] = await Promise.all([
      prisma.sale.findMany({
        where: { saleDate: { gte: startDate, lt: endDate }, paymentStatus: "PAID" },
        include: { items: true, payments: true },
        orderBy: { saleDate: "asc" },
      }),
      prisma.sale.findMany({
        where: { saleDate: { gte: prevStartDate, lt: prevEndDate }, paymentStatus: "PAID" },
      }),
    ]);

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const saleCount = sales.length;
    const averagePerCustomer = saleCount > 0 ? Math.round(totalSales / saleCount) : 0;

    const prevTotalSales = prevSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const prevSaleCount = prevSales.length;
    const prevAveragePerCustomer = prevSaleCount > 0 ? Math.round(prevTotalSales / prevSaleCount) : 0;

    const salesChange = prevTotalSales > 0
      ? Math.round(((totalSales - prevTotalSales) / prevTotalSales) * 100)
      : 0;
    const countChange = prevSaleCount > 0
      ? Math.round(((saleCount - prevSaleCount) / prevSaleCount) * 100)
      : 0;

    // Daily data for chart
    const dailyData: Record<string, { date: string; amount: number; count: number }> = {};
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      dailyData[dateStr] = { date: dateStr, amount: 0, count: 0 };
    }
    for (const sale of sales) {
      const dateStr = sale.saleDate.toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].amount += sale.totalAmount;
        dailyData[dateStr].count += 1;
      }
    }

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { count: number; amount: number }> = {};
    for (const sale of sales) {
      for (const payment of sale.payments) {
        if (!paymentMethodBreakdown[payment.paymentMethod]) {
          paymentMethodBreakdown[payment.paymentMethod] = { count: 0, amount: 0 };
        }
        paymentMethodBreakdown[payment.paymentMethod].count += 1;
        paymentMethodBreakdown[payment.paymentMethod].amount += payment.amount;
      }
    }

    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; amount: number }> = {};
    let menuTotal = 0;
    let productTotal = 0;
    for (const sale of sales) {
      for (const item of sale.items) {
        if (item.itemType === "MENU") {
          menuTotal += item.subtotal;
          if (item.category) {
            if (!categoryBreakdown[item.category]) {
              categoryBreakdown[item.category] = { count: 0, amount: 0 };
            }
            categoryBreakdown[item.category].count += item.quantity;
            categoryBreakdown[item.category].amount += item.subtotal;
          }
        } else {
          productTotal += item.subtotal;
        }
      }
    }

    const totalDiscount = sales.reduce((sum, sale) => sum + sale.discountAmount, 0);
    const totalTax = sales.reduce((sum, sale) => sum + sale.taxAmount, 0);

    // Weekday breakdown
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekdayBreakdown: Record<string, { count: number; amount: number }> = {};
    for (const day of weekdays) {
      weekdayBreakdown[day] = { count: 0, amount: 0 };
    }
    for (const sale of sales) {
      const dayOfWeek = weekdays[sale.saleDate.getDay()];
      weekdayBreakdown[dayOfWeek].count += 1;
      weekdayBreakdown[dayOfWeek].amount += sale.totalAmount;
    }

    return NextResponse.json({
      year, month,
      summary: {
        totalSales, saleCount, averagePerCustomer,
        totalDiscount, totalTax, menuTotal, productTotal,
        prevTotalSales, prevSaleCount, prevAveragePerCustomer,
        salesChange, countChange,
      },
      dailyData: Object.values(dailyData),
      paymentMethodBreakdown,
      categoryBreakdown,
      weekdayBreakdown,
    });
  } catch (error) {
    console.error("Get monthly report error:", error);
    return NextResponse.json({ error: "月別レポートの取得に失敗しました" }, { status: 500 });
  }
}
