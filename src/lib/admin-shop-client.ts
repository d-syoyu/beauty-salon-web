'use client';

const SELECTED_SHOP_COOKIE = "selected_shop_id";

export const ADMIN_SHOP_CHANGED_EVENT = "admin-shop-changed";

export type AdminShopChangedDetail = {
  shopId: string | null;
};

export function getSelectedShopIdFromCookie() {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SELECTED_SHOP_COOKIE}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}

export function dispatchAdminShopChanged(shopId: string | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AdminShopChangedDetail>(ADMIN_SHOP_CHANGED_EVENT, {
      detail: { shopId },
    }),
  );
}

export function subscribeAdminShopChanged(
  callback: (detail: AdminShopChangedDetail) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler: EventListener = (event) => {
    callback((event as CustomEvent<AdminShopChangedDetail>).detail);
  };

  window.addEventListener(ADMIN_SHOP_CHANGED_EVENT, handler);

  return () => {
    window.removeEventListener(ADMIN_SHOP_CHANGED_EVENT, handler);
  };
}
