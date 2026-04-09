import { prisma } from '@/lib/db';
import { ensureDefaultShopSetup } from '@/lib/admin-shop';
import ShopsClient from './ShopsClient';

export const metadata = { title: 'Shops | Admin' };

export default async function ShopsPage() {
  await ensureDefaultShopSetup(prisma);

  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      publicSlug: true,
      address: true,
      phoneNumber: true,
      description: true,
      accessInfo: true,
      coverImageUrl: true,
      googleBusinessLocationId: true,
      isActive: true,
      isPublished: true,
      businessHours: {
        select: {
          id: true,
          dayOfWeek: true,
          isOpen: true,
          openTime: true,
          closeTime: true,
          lastBookingOffsetMin: true,
        },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });

  return <ShopsClient initialShops={shops} />;
}
