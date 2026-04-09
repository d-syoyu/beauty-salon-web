import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';
import { getSelectedShopIdFromCookies } from '@/lib/admin-shop';

type Params = { params: Promise<{ id: string }> };

function normalizeChannels(input: unknown) {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const selectedShopId = await getSelectedShopIdFromCookies(prisma);

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: String(body.title).trim() }),
      ...(body.body !== undefined && { body: String(body.body).trim() }),
      ...(body.content !== undefined && { body: String(body.content).trim() }),
      ...(body.imageUrl !== undefined && { imageUrl: String(body.imageUrl).trim() || null }),
      ...(body.channels !== undefined && { channels: normalizeChannels(body.channels) }),
      ...(body.publishedAt !== undefined && {
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      }),
      ...(body.expiresAt !== undefined && {
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      }),
      ...(body.shopId !== undefined && {
        shopId:
          typeof body.shopId === 'string'
            ? body.shopId
            : selectedShopId,
      }),
    },
    include: {
      shop: { select: { id: true, name: true } },
      sends: { orderBy: { sentAt: 'desc' } },
    },
  });

  return NextResponse.json({ announcement });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;

  try {
    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }
}
