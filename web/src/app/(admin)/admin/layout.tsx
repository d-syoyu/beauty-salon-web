import SessionProvider from "@/components/providers/session-provider";
import AdminAutoAuth from "@/components/admin/AdminAutoAuth";
import { AdminToaster } from "@/components/admin/AdminToaster";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import FloatingBackButton from "@/components/FloatingBackButton";
import { ADMIN_AUTH_DISABLED } from "@/lib/admin-access";
import { getDemoAdminSession } from "@/lib/admin-demo";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAdminShopContext } from "@/lib/admin-shop";

export const metadata = {
  title: {
    default: "管理画面 | SOGA",
    template: "%s | 管理画面 | SOGA",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [demoSession, { shops, selectedShopId }] = await Promise.all([
    ADMIN_AUTH_DISABLED ? getDemoAdminSession() : Promise.resolve(null),
    getAdminShopContext(prisma),
  ]);
  const user = ADMIN_AUTH_DISABLED ? demoSession?.user ?? null : await getCurrentUser();
  const currentUser = {
    name: user?.name ?? null,
    email: user?.email ?? null,
  };

  const content = (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <AdminSidebar
        shops={shops}
        selectedShopId={selectedShopId}
        currentUser={currentUser}
        storefrontUrl="/"
      />
      <main className="min-w-0 overflow-x-hidden pt-14 md:pt-0 md:pl-56 xl:pl-14">
        {children}
      </main>
      <FloatingBackButton />
      <AdminToaster richColors position="top-right" />
    </div>
  );

  return (
    <SessionProvider session={demoSession}>
      {ADMIN_AUTH_DISABLED ? content : <AdminAutoAuth>{content}</AdminAutoAuth>}
    </SessionProvider>
  );
}
