import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';
import { getSelectedShopIdFromCookies } from '@/lib/admin-shop';

function normalizeChannels(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const status = request.nextUrl.searchParams.get('status') || undefined;
  const selectedShopId = await getSelectedShopIdFromCookies(prisma);

  const announcements = await prisma.announcement.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(selectedShopId ? { shopId: selectedShopId } : {}),
    },
    include: {
      shop: { select: { id: true, name: true } },
      sends: { orderBy: { sentAt: 'desc' } },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return NextResponse.json({ announcements });
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const body = await request.json();
  const selectedShopId = await getSelectedShopIdFromCookies(prisma);
  const title = String(body.title ?? '').trim();
  const content = String(body.body ?? body.content ?? '').trim();

  if (!title || !content) {
    return NextResponse.json(
      { error: 'Title and body are required.' },
      { status: 400 },
    );
  }

  const announcement = await prisma.announcement.create({
    data: {
      shopId:
        typeof body.shopId === 'string'
          ? body.shopId
          : selectedShopId,
      title,
      body: content,
      imageUrl: String(body.imageUrl ?? '').trim() || null,
      channels: normalizeChannels(body.channels),
      status: 'draft',
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      targetCategoryIds: JSON.stringify([]),
      targetMenuIds: JSON.stringify([]),
      targetLastVisitMonths: null,
      targetMinVisitCount: null,
    },
    include: {
      shop: { select: { id: true, name: true } },
      sends: true,
    },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
