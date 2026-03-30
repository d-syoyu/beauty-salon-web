// src/app/(admin)/admin/layout.tsx
// Admin Layout - Auto guest auth, session cleared on tab close

import SessionProvider from "@/components/providers/session-provider";
import AdminAutoAuth from "@/components/admin/AdminAutoAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import FloatingBackButton from "@/components/FloatingBackButton";
import { Toaster } from "@/components/ui/sonner";
import { ADMIN_AUTH_DISABLED } from "@/lib/admin-access";
import { getDemoAdminSession } from "@/lib/admin-demo";

export const metadata = {
  title: "Admin | LUMINA HAIR STUDIO",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demoSession = ADMIN_AUTH_DISABLED ? await getDemoAdminSession() : null;
  const content = (
    <>
      <div className="min-h-screen bg-muted/40 text-foreground">
        <AdminSidebar />
        <main className="min-w-0 overflow-x-hidden lg:pl-14">
          {children}
        </main>
        <Toaster richColors position="top-right" />
      </div>
      <FloatingBackButton />
    </>
  );

  return (
    <SessionProvider session={demoSession}>
      {ADMIN_AUTH_DISABLED ? content : <AdminAutoAuth>{content}</AdminAutoAuth>}
    </SessionProvider>
  );
}
