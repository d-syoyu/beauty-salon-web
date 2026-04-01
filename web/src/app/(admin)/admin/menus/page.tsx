import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import { measureAdminTask, startAdminTimer } from '@/lib/admin-performance';
import MenusClient, { type Category, type Menu, type Product } from './MenusClient';

type SearchParams = Promise<{ tab?: string }>;
type TabType = 'menus' | 'products' | 'categories';

function normalizeTab(tab?: string): TabType {
  if (tab === 'products' || tab === 'categories') return tab;
  return 'menus';
}

function MenusPageFallback() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-80 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="h-11 w-80 rounded-lg bg-gray-100 animate-pulse" />
      <div className="rounded-xl bg-white shadow-sm p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 rounded-lg bg-gray-50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function MenusPageContent({ searchParams }: { searchParams: SearchParams }) {
  const { tab } = await searchParams;
  const defaultTab = normalizeTab(tab);

  const [rawCategories, rawMenus, rawProducts] = await Promise.all([
    measureAdminTask('menus.categories', () =>
      prisma.category.findMany({
        orderBy: { displayOrder: 'asc' },
        include: { _count: { select: { menus: true } } },
      }),
    ),
    measureAdminTask('menus.list', () =>
      prisma.menu.findMany({
        include: { category: true },
        orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
      }),
    ),
    defaultTab === 'products'
      ? measureAdminTask('menus.products.initial', () =>
          prisma.product.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
          }),
        )
      : Promise.resolve([]),
  ]);

  const categories: Category[] = rawCategories.map((category) => ({
    id: category.id,
    name: category.name,
    nameEn: category.nameEn,
    color: category.color,
    displayOrder: category.displayOrder,
    isActive: category.isActive,
    menuCount: category._count.menus,
  }));

  const menus: Menu[] = rawMenus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    categoryId: menu.categoryId,
    price: menu.price,
    priceVariable: menu.priceVariable,
    duration: menu.duration,
    lastBookingTime: menu.lastBookingTime,
    displayOrder: menu.displayOrder,
    isActive: menu.isActive,
    category: {
      id: menu.category.id,
      name: menu.category.name,
      nameEn: menu.category.nameEn,
      color: menu.category.color,
    },
  }));

  const products: Product[] = rawProducts.map((product) => ({
    id: product.id,
    name: product.name,
    categoryName: product.categoryName,
    unitPrice: product.unitPrice,
    stockQuantity: product.stockQuantity,
    sku: product.sku,
    description: product.description,
    isActive: product.isActive,
  }));

  return (
    <MenusClient
      initialCategories={categories}
      initialMenus={menus}
      initialProducts={products}
      initialProductsLoaded={defaultTab === 'products'}
      defaultTab={defaultTab}
    />
  );
}

export default async function AdminMenusPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const end = startAdminTimer('menus.page.total');

  try {
    return (
      <Suspense fallback={<MenusPageFallback />}>
        <MenusPageContent searchParams={searchParams} />
      </Suspense>
    );
  } finally {
    end();
  }
}
