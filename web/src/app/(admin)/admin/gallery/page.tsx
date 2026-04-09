import { prisma } from '@/lib/db';
import { getAdminShopContext } from '@/lib/admin-shop';
import { GalleryClient } from './GalleryClient';

export const metadata = { title: 'Gallery | Admin' };

export default async function GalleryPage() {
  const { shops, selectedShopId } = await getAdminShopContext(prisma);
  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? null;

  const photos = await prisma.galleryPhoto.findMany({
    where: selectedShopId ? { shopId: selectedShopId } : undefined,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <GalleryClient
      initialPhotos={photos}
      selectedShopId={selectedShopId}
      shopName={selectedShop?.name ?? null}
    />
  );
}
