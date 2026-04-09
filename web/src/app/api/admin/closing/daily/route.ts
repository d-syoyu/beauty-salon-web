import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';
import { getSelectedShopIdFromCookies } from '@/lib/admin-shop';
import { computeDailyClosingSnapshot } from '@/lib/admin-closing';

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date is required.' }, { status: 400 });
  }

  const selectedShopId = await getSelectedShopIdFromCookies(prisma);
  const snapshot = await computeDailyClosingSnapshot(prisma, date, selectedShopId);
  const closing = await prisma.dailyClosing.findFirst({
    where: {
      shopId: selectedShopId ?? null,
      date: snapshot.date,
    },
  });

  return NextResponse.json({ snapshot, closing });
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  const body = await request.json();
  const date = String(body.date ?? '').trim();
  if (!date) {
    return NextResponse.json({ error: 'date is required.' }, { status: 400 });
  }

  const selectedShopId = await getSelectedShopIdFromCookies(prisma);
  const snapshot = await computeDailyClosingSnapshot(prisma, date, selectedShopId);
  const existing = await prisma.dailyClosing.findFirst({
    where: {
      shopId: selectedShopId ?? null,
      date: snapshot.date,
    },
    select: { id: true },
  });

  const payload = {
    shopId: selectedShopId,
    date: snapshot.date,
    status: 'closed' as const,
    totalSales: snapshot.totalSales,
    saleCount: snapshot.saleCount,
    totalTax: snapshot.totalTax,
    totalDiscount: snapshot.totalDiscount,
    paymentBreakdown: snapshot.paymentBreakdown,
    expectedCash: snapshot.expectedCash,
    actualCash: body.actualCash != null ? Number(body.actualCash) : null,
    cashDifference:
      body.actualCash != null ? Number(body.actualCash) - snapshot.expectedCash : null,
    note: String(body.note ?? '').trim() || null,
    closedAt: new Date(),
    closedByUserId: user?.id ?? null,
  };

  const closing = existing
    ? await prisma.dailyClosing.update({ where: { id: existing.id }, data: payload })
    : await prisma.dailyClosing.create({ data: payload });

  return NextResponse.json({ closing, snapshot });
}
