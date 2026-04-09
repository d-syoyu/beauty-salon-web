import { prisma } from '@/lib/db';
import { getAdminShopContext } from '@/lib/admin-shop';
import { CampaignsClient } from './CampaignsClient';

export const metadata = { title: 'Campaigns | Admin' };

export default async function CampaignsPage() {
  const { shops, selectedShopId } = await getAdminShopContext(prisma);
  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? null;

  const announcements = await prisma.announcement.findMany({
    where: selectedShopId ? { shopId: selectedShopId } : undefined,
    include: {
      shop: { select: { id: true, name: true } },
      sends: { orderBy: { sentAt: 'desc' } },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return (
    <CampaignsClient
      initialAnnouncements={announcements}
      selectedShopId={selectedShopId}
      shopName={selectedShop?.name ?? null}
    />
  );
}
