import { prisma } from "@/lib/db";

export type AdminSaleRow = {
  id: string;
  saleNumber: string;
  customerName: string | null;
  staffName: string | null;
  isNominated: boolean;
  saleDate: string;
  saleTime: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  couponDiscount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  note: string | null;
  items: Array<{
    id: string;
    itemType: string;
    menuName: string | null;
    productName: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  user: { name: string | null; phone: string | null } | null;
  coupon: { code: string; name: string } | null;
  createdByUser: { name: string | null } | null;
};

export type PaymentMethodOption = {
  code: string;
  displayName: string;
};

export async function getAdminSalesPageData(selectedShopId: string | null) {
  const [sales, paymentMethods] = await Promise.all([
    prisma.sale.findMany({
      where: selectedShopId ? { shopId: selectedShopId } : {},
      include: {
        items: { orderBy: { orderIndex: "asc" } },
        user: { select: { name: true, phone: true } },
        coupon: { select: { code: true, name: true } },
        createdByUser: { select: { name: true } },
      },
      orderBy: [{ saleDate: "desc" }, { saleTime: "desc" }],
      take: 100,
    }),
    selectedShopId
      ? prisma.paymentMethodSetting.findMany({
          where: {
            shopId: selectedShopId,
            channel: "IN_STORE",
            isActive: true,
          },
          select: {
            code: true,
            displayName: true,
          },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([] as PaymentMethodOption[]),
  ]);

  return {
    sales: sales.map((sale) => ({
      ...sale,
      saleDate: sale.saleDate.toISOString(),
    })) as AdminSaleRow[],
    paymentMethods: paymentMethods as PaymentMethodOption[],
    selectedShopId,
  };
}
