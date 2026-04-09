import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';
import { ensureDefaultShopSetup } from '@/lib/admin-shop';
import { ensureUniqueShopSlug } from '@/lib/slug';

const defaultBusinessHours = [
  { dayOfWeek: 0, isOpen: true, openTime: '09:00', closeTime: '18:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 1, isOpen: false, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 2, isOpen: true, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 3, isOpen: true, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 4, isOpen: true, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 5, isOpen: true, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '18:00', lastBookingOffsetMin: 60 },
];

type BusinessHourInput = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  lastBookingOffsetMin?: number;
};

function normalizeBusinessHours(input: unknown): BusinessHourInput[] {
  if (!Array.isArray(input)) return defaultBusinessHours;

  return input
    .filter(
      (item): item is BusinessHourInput =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as BusinessHourInput).dayOfWeek === 'number',
    )
    .map((item) => ({
      dayOfWeek: item.dayOfWeek,
      isOpen: Boolean(item.isOpen),
      openTime: item.openTime || '10:00',
      closeTime: item.closeTime || '19:00',
      lastBookingOffsetMin:
        typeof item.lastBookingOffsetMin === 'number' ? item.lastBookingOffsetMin : 60,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  await ensureDefaultShopSetup(prisma);

  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      businessHours: {
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });

  return NextResponse.json(shops);
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  await ensureDefaultShopSetup(prisma);

  const body = await request.json();
  const name = String(body.name ?? '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Shop name is required.' }, { status: 400 });
  }

  const publicSlug = await ensureUniqueShopSlug(
    prisma,
    String(body.publicSlug ?? '').trim() || name,
  );
  const businessHours = normalizeBusinessHours(body.businessHours);

  const shop = await prisma.shop.create({
    data: {
      name,
      publicSlug,
      address: String(body.address ?? '').trim() || null,
      phoneNumber: String(body.phoneNumber ?? '').trim() || null,
      description: String(body.description ?? '').trim() || null,
      accessInfo: String(body.accessInfo ?? '').trim() || null,
      coverImageUrl: String(body.coverImageUrl ?? '').trim() || null,
      googleBusinessLocationId: String(body.googleBusinessLocationId ?? '').trim() || null,
      isActive: body.isActive !== false,
      isPublished: body.isPublished !== false,
      businessHours: {
        create: businessHours.map((item) => ({
          dayOfWeek: item.dayOfWeek,
          isOpen: item.isOpen,
          openTime: item.openTime,
          closeTime: item.closeTime,
          lastBookingOffsetMin: item.lastBookingOffsetMin ?? 60,
        })),
      },
    },
    include: {
      businessHours: {
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });

  return NextResponse.json(shop, { status: 201 });
}
