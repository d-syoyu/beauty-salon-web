import { prisma } from '@/lib/db';
import { getAdminShopContext } from '@/lib/admin-shop';
import ProductsClient from './ProductsClient';

export const metadata = { title: 'Products | Admin' };

export default async function ProductsPage() {
  const { shops, selectedShopId } = await getAdminShopContext(prisma);
  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? null;

  const products = await prisma.product.findMany({
    where: selectedShopId ? { shops: { some: { shopId: selectedShopId } } } : undefined,
    include: {
      shops: { select: { shopId: true } },
    },
    orderBy: [{ categoryName: 'asc' }, { name: 'asc' }],
  });

  return (
    <ProductsClient
      initialProducts={products}
      selectedShopId={selectedShopId}
      shopName={selectedShop?.name ?? null}
    />
  );
}
