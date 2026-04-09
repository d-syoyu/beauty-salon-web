import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';
import { getSelectedShopIdFromCookies } from '@/lib/admin-shop';

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const selectedShopId = await getSelectedShopIdFromCookies(prisma);

  const photos = await prisma.galleryPhoto.findMany({
    where: selectedShopId ? { shopId: selectedShopId } : undefined,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ photos });
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const body = await request.json();
  const selectedShopId = await getSelectedShopIdFromCookies(prisma);
  const imageUrl = String(body.imageUrl ?? '').trim();

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
  }

  const photo = await prisma.galleryPhoto.create({
    data: {
      shopId: typeof body.shopId === 'string' ? body.shopId : selectedShopId,
      imageUrl,
      caption: String(body.caption ?? '').trim() || null,
      displayOrder: Number(body.displayOrder ?? 0),
      isPublished: Boolean(body.isPublished),
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
