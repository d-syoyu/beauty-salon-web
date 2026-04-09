import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';
import { ensureUniqueShopSlug } from '@/lib/slug';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.shop.findUnique({
    where: { id },
    include: { businessHours: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });
  }

  const data: Record<string, unknown> = {
    ...(body.name !== undefined && { name: String(body.name).trim() }),
    ...(body.address !== undefined && { address: String(body.address).trim() || null }),
    ...(body.phoneNumber !== undefined && { phoneNumber: String(body.phoneNumber).trim() || null }),
    ...(body.description !== undefined && { description: String(body.description).trim() || null }),
    ...(body.accessInfo !== undefined && { accessInfo: String(body.accessInfo).trim() || null }),
    ...(body.coverImageUrl !== undefined && { coverImageUrl: String(body.coverImageUrl).trim() || null }),
    ...(body.googleBusinessLocationId !== undefined && {
      googleBusinessLocationId: String(body.googleBusinessLocationId).trim() || null,
    }),
    ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    ...(body.isPublished !== undefined && { isPublished: Boolean(body.isPublished) }),
  };

  if (body.publicSlug !== undefined || body.name !== undefined) {
    data.publicSlug = await ensureUniqueShopSlug(
      prisma,
      String(body.publicSlug ?? body.name ?? existing.publicSlug ?? existing.name).trim(),
      existing.id,
    );
  }

  const shop = await prisma.$transaction(async (tx) => {
    const updated = await tx.shop.update({
      where: { id },
      data,
    });

    if (Array.isArray(body.businessHours)) {
      await tx.shopBusinessHour.deleteMany({ where: { shopId: id } });
      await tx.shopBusinessHour.createMany({
        data: body.businessHours.map(
          (item: {
            dayOfWeek: number;
            isOpen: boolean;
            openTime: string;
            closeTime: string;
            lastBookingOffsetMin?: number;
          }) => ({
            shopId: id,
            dayOfWeek: item.dayOfWeek,
            isOpen: Boolean(item.isOpen),
            openTime: item.openTime || '10:00',
            closeTime: item.closeTime || '19:00',
            lastBookingOffsetMin:
              typeof item.lastBookingOffsetMin === 'number' ? item.lastBookingOffsetMin : 60,
          }),
        ),
      });
    }

    return updated;
  });

  const hydrated = await prisma.shop.findUnique({
    where: { id: shop.id },
    include: {
      businessHours: {
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });

  return NextResponse.json(hydrated);
}
