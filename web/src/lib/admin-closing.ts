import 'server-only';

import type { PrismaClient } from '@prisma/client';

export function getDayRange(dateInput: string | Date) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : new Date(dateInput);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function buildShopWhere(shopId?: string | null) {
  return shopId ? { shopId } : {};
}

function toDateOnly(dateInput: string | Date) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T12:00:00`) : new Date(dateInput);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

export async function computeDailyClosingSnapshot(
  prisma: PrismaClient,
  dateInput: string | Date,
  shopId?: string | null,
) {
  const { start, end } = getDayRange(dateInput);
  const sales = await prisma.sale.findMany({
    where: {
      ...buildShopWhere(shopId),
      saleDate: { gte: start, lte: end },
      paymentStatus: 'PAID',
    },
    select: {
      totalAmount: true,
      taxAmount: true,
      discountAmount: true,
      paymentMethod: true,
    },
  });

  const paymentBreakdown: Record<string, number> = {};
  let totalSales = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  for (const sale of sales) {
    totalSales += sale.totalAmount;
    totalTax += sale.taxAmount;
    totalDiscount += sale.discountAmount;
    paymentBreakdown[sale.paymentMethod] = (paymentBreakdown[sale.paymentMethod] ?? 0) + sale.totalAmount;
  }

  return {
    date: toDateOnly(dateInput),
    saleCount: sales.length,
    totalSales,
    totalTax,
    totalDiscount,
    paymentBreakdown,
    expectedCash: paymentBreakdown.CASH ?? 0,
  };
}

export async function computeMonthlyClosingSnapshot(
  prisma: PrismaClient,
  year: number,
  month: number,
  shopId?: string | null,
) {
  const { start, end } = getMonthRange(year, month);
  const sales = await prisma.sale.findMany({
    where: {
      ...buildShopWhere(shopId),
      saleDate: { gte: start, lte: end },
      paymentStatus: 'PAID',
    },
    select: {
      totalAmount: true,
      taxAmount: true,
      discountAmount: true,
      paymentMethod: true,
    },
  });

  const paymentBreakdown: Record<string, number> = {};
  let totalSales = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  for (const sale of sales) {
    totalSales += sale.totalAmount;
    totalTax += sale.taxAmount;
    totalDiscount += sale.discountAmount;
    paymentBreakdown[sale.paymentMethod] = (paymentBreakdown[sale.paymentMethod] ?? 0) + sale.totalAmount;
  }

  const dailyClosingCount = await prisma.dailyClosing.count({
    where: {
      ...buildShopWhere(shopId),
      date: { gte: start, lte: end },
      status: 'closed',
    },
  });

  return {
    year,
    month,
    saleCount: sales.length,
    totalSales,
    totalTax,
    totalDiscount,
    paymentBreakdown,
    averagePerCustomer: sales.length > 0 ? Math.round(totalSales / sales.length) : 0,
    dailyClosingCount,
  };
}
