// src/app/(admin)/admin/menus/page.tsx
// RSC: fetches categories, menus, products directly via Prisma

import { prisma } from '@/lib/db';
import MenusClient, { type Category, type Menu, type Product } from './MenusClient';

export default async function AdminMenusPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = (tab === 'products' || tab === 'categories') ? tab : 'menus';

  const [rawCategories, rawMenus, rawProducts] = await Promise.all([
    prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { menus: true } } },
    }),
    prisma.menu.findMany({
      include: { category: true },
      orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const categories: Category[] = rawCategories.map((c) => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    color: c.color,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    menuCount: c._count.menus,
  }));

  const menus: Menu[] = rawMenus.map((m) => ({
    id: m.id,
    name: m.name,
    categoryId: m.categoryId,
    price: m.price,
    priceVariable: m.priceVariable,
    duration: m.duration,
    lastBookingTime: m.lastBookingTime,
    displayOrder: m.displayOrder,
    isActive: m.isActive,
    category: {
      id: m.category.id,
      name: m.category.name,
      nameEn: m.category.nameEn,
      color: m.category.color,
    },
  }));

  const products: Product[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.categoryName,
    unitPrice: p.unitPrice,
    stockQuantity: p.stockQuantity,
    sku: p.sku,
    description: p.description,
    isActive: p.isActive,
  }));

  return (
    <MenusClient
      initialCategories={categories}
      initialMenus={menus}
      initialProducts={products}
      defaultTab={defaultTab}
    />
  );
}
