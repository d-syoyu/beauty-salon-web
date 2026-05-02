import { prisma } from "@/lib/db";
import { getAdminSalesPageData } from "@/lib/admin-sales";
import { getAdminShopContext } from "@/lib/admin-shop";
import SalesClient from "./SalesClient";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const { selectedShopId } = await getAdminShopContext(prisma);
  const initialData = await getAdminSalesPageData(selectedShopId);

  return <SalesClient initialData={initialData} />;
}
