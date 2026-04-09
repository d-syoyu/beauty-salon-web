import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';
import { getSelectedShopIdFromCookies } from '@/lib/admin-shop';
import { computeMonthlyClosingSnapshot } from '@/lib/admin-closing';

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const year = Number(request.nextUrl.searchParams.get('year'));
  const month = Number(request.nextUrl.searchParams.get('month'));
  if (!year || !month) {
    return NextResponse.json({ error: 'year and month are required.' }, { status: 400 });
  }

  const selectedShopId = await getSelectedShopIdFromCookies(prisma);
  const snapshot = await computeMonthlyClosingSnapshot(prisma, year, month, selectedShopId);
  const closing = await prisma.monthlyClosing.findFirst({
    where: {
      shopId: selectedShopId ?? null,
      year,
      month,
    },
  });

  return NextResponse.json({ snapshot, closing });
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  const body = await request.json();
  const year = Number(body.year);
  const month = Number(body.month);
  if (!year || !month) {
    return NextResponse.json({ error: 'year and month are required.' }, { status: 400 });
  }

  const selectedShopId = await getSelectedShopIdFromCookies(prisma);
  const snapshot = await computeMonthlyClosingSnapshot(prisma, year, month, selectedShopId);
  const existing = await prisma.monthlyClosing.findFirst({
    where: {
      shopId: selectedShopId ?? null,
      year,
      month,
    },
    select: { id: true },
  });

  const payload = {
    shopId: selectedShopId,
    year,
    month,
    status: 'closed' as const,
    totalSales: snapshot.totalSales,
    saleCount: snapshot.saleCount,
    totalTax: snapshot.totalTax,
    totalDiscount: snapshot.totalDiscount,
    averagePerCustomer: snapshot.averagePerCustomer,
    paymentBreakdown: snapshot.paymentBreakdown,
    dailyClosingCount: snapshot.dailyClosingCount,
    note: String(body.note ?? '').trim() || null,
    closedAt: new Date(),
    closedByUserId: user?.id ?? null,
  };

  const closing = existing
    ? await prisma.monthlyClosing.update({ where: { id: existing.id }, data: payload })
    : await prisma.monthlyClosing.create({ data: payload });

  return NextResponse.json({ closing, snapshot });
}
