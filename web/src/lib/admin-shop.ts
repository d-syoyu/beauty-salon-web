import "server-only";

import type { PrismaClient, Shop } from "@prisma/client";
import { cookies } from "next/headers";

export const SELECTED_SHOP_COOKIE = "selected_shop_id";
export const DEFAULT_SHOP_SLUG = "main-salon";
export const DEFAULT_SHOP_NAME = "メイン店舗";

const DEFAULT_BUSINESS_HOURS = [
  { dayOfWeek: 0, isOpen: true, openTime: "09:00", closeTime: "18:00", lastBookingOffsetMin: 60 },
  { dayOfWeek: 1, isOpen: false, openTime: "10:00", closeTime: "19:00", lastBookingOffsetMin: 60 },
  { dayOfWeek: 2, isOpen: true, openTime: "10:00", closeTime: "19:00", lastBookingOffsetMin: 60 },
  { dayOfWeek: 3, isOpen: true, openTime: "10:00", closeTime: "19:00", lastBookingOffsetMin: 60 },
  { dayOfWeek: 4, isOpen: true, openTime: "10:00", closeTime: "19:00", lastBookingOffsetMin: 60 },
  { dayOfWeek: 5, isOpen: true, openTime: "10:00", closeTime: "19:00", lastBookingOffsetMin: 60 },
  { dayOfWeek: 6, isOpen: true, openTime: "09:00", closeTime: "18:00", lastBookingOffsetMin: 60 },
] as const;

type ShopSummary = Pick<Shop, "id" | "name" | "isActive">;

let defaultShopSetupPromise: Promise<ShopSummary> | null = null;

async function ensureDefaultBusinessHours(prisma: PrismaClient, shopId: string) {
  const count = await prisma.shopBusinessHour.count({ where: { shopId } });
  if (count > 0) return;

  await prisma.shopBusinessHour.createMany({
    data: DEFAULT_BUSINESS_HOURS.map((item) => ({ shopId, ...item })),
  });
}

async function loadOrCreateDefaultShop(prisma: PrismaClient): Promise<ShopSummary> {
  let shop = await prisma.shop.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, isActive: true },
  });

  if (!shop) {
    try {
      const created = await prisma.shop.create({
        data: {
          name: DEFAULT_SHOP_NAME,
          publicSlug: DEFAULT_SHOP_SLUG,
          isActive: true,
          isPublished: true,
          businessHours: {
            create: DEFAULT_BUSINESS_HOURS.map((item) => ({ ...item })),
          },
        },
        select: { id: true, name: true, isActive: true },
      });
      shop = created;
    } catch (error) {
      const concurrentShop = await prisma.shop.findFirst({
        where: { publicSlug: DEFAULT_SHOP_SLUG },
        select: { id: true, name: true, isActive: true },
      });

      if (!concurrentShop) {
        throw error;
      }

      shop = concurrentShop;
      await ensureDefaultBusinessHours(prisma, shop.id);
    }
  } else {
    await ensureDefaultBusinessHours(prisma, shop.id);
  }

  return shop;
}

async function backfillNullableShopRelations(prisma: PrismaClient, shopId: string) {
  const [reservationId, saleId, holidayId, specialOpenDayId, paymentMethodId] = await Promise.all([
    prisma.reservation.findFirst({ where: { shopId: null }, select: { id: true } }),
    prisma.sale.findFirst({ where: { shopId: null }, select: { id: true } }),
    prisma.holiday.findFirst({ where: { shopId: null }, select: { id: true } }),
    prisma.specialOpenDay.findFirst({ where: { shopId: null }, select: { id: true } }),
    prisma.paymentMethodSetting.findFirst({ where: { shopId: null }, select: { id: true } }),
  ]);

  const updates: Promise<unknown>[] = [];

  if (reservationId) {
    updates.push(prisma.reservation.updateMany({ where: { shopId: null }, data: { shopId } }));
  }
  if (saleId) {
    updates.push(prisma.sale.updateMany({ where: { shopId: null }, data: { shopId } }));
  }
  if (holidayId) {
    updates.push(prisma.holiday.updateMany({ where: { shopId: null }, data: { shopId } }));
  }
  if (specialOpenDayId) {
    updates.push(prisma.specialOpenDay.updateMany({ where: { shopId: null }, data: { shopId } }));
  }
  if (paymentMethodId) {
    updates.push(
      prisma.paymentMethodSetting.updateMany({ where: { shopId: null }, data: { shopId } }),
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

async function syncShopMemberships(prisma: PrismaClient, shopId: string) {
  const [staffCount, staffShopCount, categoryCount, categoryShopCount, menuCount, menuShopCount, productCount, productShopCount, couponCount, couponShopCount] =
    await Promise.all([
      prisma.staff.count(),
      prisma.staffShop.count({ where: { shopId } }),
      prisma.category.count(),
      prisma.categoryShop.count({ where: { shopId } }),
      prisma.menu.count(),
      prisma.menuShop.count({ where: { shopId } }),
      prisma.product.count(),
      prisma.productShop.count({ where: { shopId } }),
      prisma.coupon.count(),
      prisma.couponShop.count({ where: { shopId } }),
    ]);

  if (staffCount > staffShopCount) {
    const staff = await prisma.staff.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } });
    if (staff.length > 0) {
      await prisma.staffShop.createMany({
        data: staff.map((item, index) => ({
          staffId: item.id,
          shopId,
          isPrimary: index === 0,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (categoryCount > categoryShopCount) {
    const categories = await prisma.category.findMany({ select: { id: true } });
    if (categories.length > 0) {
      await prisma.categoryShop.createMany({
        data: categories.map((item) => ({ categoryId: item.id, shopId })),
        skipDuplicates: true,
      });
    }
  }

  if (menuCount > menuShopCount) {
    const menus = await prisma.menu.findMany({ select: { id: true } });
    if (menus.length > 0) {
      await prisma.menuShop.createMany({
        data: menus.map((item) => ({ menuId: item.id, shopId })),
        skipDuplicates: true,
      });
    }
  }

  if (productCount > productShopCount) {
    const products = await prisma.product.findMany({ select: { id: true } });
    if (products.length > 0) {
      await prisma.productShop.createMany({
        data: products.map((item) => ({ productId: item.id, shopId })),
        skipDuplicates: true,
      });
    }
  }

  if (couponCount > couponShopCount) {
    const coupons = await prisma.coupon.findMany({ select: { id: true } });
    if (coupons.length > 0) {
      await prisma.couponShop.createMany({
        data: coupons.map((item) => ({ couponId: item.id, shopId })),
        skipDuplicates: true,
      });
    }
  }
}

async function runDefaultShopSetup(prisma: PrismaClient): Promise<ShopSummary> {
  const shop = await loadOrCreateDefaultShop(prisma);
  await Promise.all([
    backfillNullableShopRelations(prisma, shop.id),
    syncShopMemberships(prisma, shop.id),
  ]);
  return shop;
}

export async function ensureDefaultShopSetup(prisma: PrismaClient): Promise<ShopSummary> {
  if (!defaultShopSetupPromise) {
    defaultShopSetupPromise = runDefaultShopSetup(prisma).finally(() => {
      defaultShopSetupPromise = null;
    });
  }

  return defaultShopSetupPromise;
}

export async function listAdminShops(prisma: PrismaClient) {
  await ensureDefaultShopSetup(prisma);
  return prisma.shop.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, name: true, isActive: true },
  });
}

export async function getValidatedSelectedShopId(
  prisma: PrismaClient,
  rawShopId: string | null,
): Promise<string | null> {
  if (!rawShopId) return null;

  const shop = await prisma.shop.findFirst({
    where: { id: rawShopId, isActive: true },
    select: { id: true },
  });

  return shop?.id ?? null;
}

export async function getSelectedShopIdFromCookies(prisma: PrismaClient): Promise<string | null> {
  const cookieStore = await cookies();
  const rawShopId = cookieStore.get(SELECTED_SHOP_COOKIE)?.value || null;
  return getValidatedSelectedShopId(prisma, rawShopId);
}

export async function getAdminShopContext(prisma: PrismaClient) {
  const defaultShop = await ensureDefaultShopSetup(prisma);
  const [shops, selectedShopId] = await Promise.all([
    prisma.shop.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    getSelectedShopIdFromCookies(prisma),
  ]);

  return {
    defaultShop,
    shops,
    selectedShopId,
  };
}
