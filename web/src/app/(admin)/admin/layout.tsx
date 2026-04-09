import SessionProvider from "@/components/providers/session-provider";
import AdminAutoAuth from "@/components/admin/AdminAutoAuth";
import { AdminToaster } from "@/components/admin/AdminToaster";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ADMIN_AUTH_DISABLED } from "@/lib/admin-access";
import { getDemoAdminSession } from "@/lib/admin-demo";
import { prisma } from "@/lib/db";
import { getAdminShopContext } from "@/lib/admin-shop";

export const metadata = {
  title: "Admin | LUMINA HAIR STUDIO",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demoSession = ADMIN_AUTH_DISABLED ? await getDemoAdminSession() : null;
  const { shops, selectedShopId } = await getAdminShopContext(prisma);

  const content = (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <AdminSidebar shops={shops} selectedShopId={selectedShopId} />
      <main className="min-w-0 overflow-x-hidden pt-14 md:pt-0 md:pl-56 xl:pl-14">
        {children}
      </main>
      <AdminToaster richColors position="top-right" />
    </div>
  );

  return (
    <SessionProvider session={demoSession}>
      {ADMIN_AUTH_DISABLED ? content : <AdminAutoAuth>{content}</AdminAutoAuth>}
    </SessionProvider>
  );
}
