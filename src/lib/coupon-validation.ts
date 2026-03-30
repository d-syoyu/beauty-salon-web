// src/lib/coupon-validation.ts
// クーポン検証共通ロジック

import { prisma } from "@/lib/db";

export interface MenuItemForCoupon {
  menuId: string;
  categoryId: string;
  price: number;
}

export interface CouponValidationParams {
  code: string;
  subtotal: number;
  customerId?: string | null;
  menuIds?: string[];
  categories?: string[];
  weekday?: number;
  time?: string;
  menuItems?: MenuItemForCoupon[];
}

export interface CouponValidationSuccess {
  valid: true;
  coupon: {
    id: string;
    code: string;
    name: string;
    type: "PERCENTAGE" | "FIXED";
    value: number;
    description: string | null;
  };
  discountAmount: number;
  message: string;
  applicableSubtotal?: number;
  applicableMenuIds?: string[];
}

export interface CouponValidationFailure {
  valid: false;
  error: string;
}

export type CouponValidationResult = CouponValidationSuccess | CouponValidationFailure;

// JSON文字列を配列にパース
function parseJsonArray(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function parseIntArray(json: string): number[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function validateCoupon(
  params: CouponValidationParams
): Promise<CouponValidationResult> {
  const {
    code,
    subtotal,
    customerId,
    menuIds = [],
    categories = [],
    weekday,
    time,
    menuItems = [],
  } = params;

  const now = new Date();

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon) {
    return { valid: false, error: "クーポンが見つかりません" };
  }

  if (!coupon.isActive) {
    return { valid: false, error: "このクーポンは現在無効です" };
  }

  if (now < coupon.validFrom) {
    return { valid: false, error: `このクーポンは${coupon.validFrom.toLocaleDateString("ja-JP")}から有効です` };
  }

  if (now > coupon.validUntil) {
    return { valid: false, error: "このクーポンの有効期限が切れています" };
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: "このクーポンは利用上限に達しています" };
  }

  if (customerId && coupon.usageLimitPerCustomer !== null) {
    const customerUsageCount = await prisma.couponUsage.count({
      where: { couponId: coupon.id, customerId },
    });
    if (customerUsageCount >= coupon.usageLimitPerCustomer) {
      return { valid: false, error: "このクーポンの利用上限に達しています" };
    }
  }

  if (customerId && coupon.onlyFirstTime) {
    const saleCount = await prisma.sale.count({ where: { userId: customerId } });
    if (saleCount > 0) {
      return { valid: false, error: "初回来店限定のクーポンです" };
    }
  }

  if (customerId && coupon.onlyReturning) {
    const saleCount = await prisma.sale.count({ where: { userId: customerId } });
    if (saleCount === 0) {
      return { valid: false, error: "リピーター限定のクーポンです" };
    }
  }

  if (coupon.minimumAmount !== null && subtotal < coupon.minimumAmount) {
    return { valid: false, error: `¥${coupon.minimumAmount.toLocaleString()}以上のご購入で利用可能です` };
  }

  const applicableMenuIdsList = parseJsonArray(coupon.applicableMenuIds);
  const applicableCategoryIdsList = parseJsonArray(coupon.applicableCategoryIds);
  const hasMenuRestriction = applicableMenuIdsList.length > 0;
  const hasCategoryRestriction = applicableCategoryIdsList.length > 0;

  if (hasMenuRestriction || hasCategoryRestriction) {
    const hasApplicableMenu = hasMenuRestriction
      ? menuIds.some((id) => applicableMenuIdsList.includes(id))
      : false;
    const hasApplicableCategory = hasCategoryRestriction
      ? categories.some((cat) => applicableCategoryIdsList.includes(cat))
      : false;

    const isApplicable =
      (hasMenuRestriction && hasApplicableMenu) ||
      (hasCategoryRestriction && hasApplicableCategory);

    if (!isApplicable) {
      return { valid: false, error: "対象メニュー/カテゴリが含まれていません" };
    }
  }

  const applicableWeekdays = parseIntArray(coupon.applicableWeekdays);
  if (applicableWeekdays.length > 0) {
    const currentWeekday = typeof weekday === "number" ? weekday : now.getDay();
    if (!applicableWeekdays.includes(currentWeekday)) {
      return { valid: false, error: "利用できない曜日です" };
    }
  }

  if (coupon.startTime && coupon.endTime) {
    const currentTime = time || now.toTimeString().slice(0, 5);
    if (currentTime < coupon.startTime || currentTime > coupon.endTime) {
      return { valid: false, error: `利用可能時間は${coupon.startTime}〜${coupon.endTime}です` };
    }
  }

  let targetSubtotal = subtotal;
  const applicableMenuIdList: string[] = [];
  const hasRestriction = hasMenuRestriction || hasCategoryRestriction;

  if (hasRestriction && menuItems.length > 0) {
    targetSubtotal = 0;
    for (const item of menuItems) {
      const menuMatch = hasMenuRestriction && applicableMenuIdsList.includes(item.menuId);
      const categoryMatch = hasCategoryRestriction && applicableCategoryIdsList.includes(item.categoryId);
      if (menuMatch || categoryMatch) {
        targetSubtotal += item.price;
        applicableMenuIdList.push(item.menuId);
      }
    }
  }

  let discountAmount: number;
  if (coupon.type === "PERCENTAGE") {
    discountAmount = Math.floor((targetSubtotal * coupon.value) / 100);
  } else {
    discountAmount = Math.min(coupon.value, targetSubtotal);
  }

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type as "PERCENTAGE" | "FIXED",
      value: coupon.value,
      description: coupon.description,
    },
    discountAmount,
    message:
      coupon.type === "PERCENTAGE"
        ? `${coupon.value}% OFF: ¥${discountAmount.toLocaleString()}割引`
        : `¥${discountAmount.toLocaleString()}割引`,
    applicableSubtotal: hasRestriction ? targetSubtotal : undefined,
    applicableMenuIds: hasRestriction ? applicableMenuIdList : undefined,
  };
}
