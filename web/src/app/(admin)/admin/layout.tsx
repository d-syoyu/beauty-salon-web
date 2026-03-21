// src/app/(admin)/admin/layout.tsx
// Admin Layout - Auto guest auth, session cleared on tab close

import SessionProvider from "@/components/providers/session-provider";
import AdminAutoAuth from "@/components/admin/AdminAutoAuth";
import FloatingBackButton from "@/components/FloatingBackButton";
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
      <div className="admin-page bg-gray-50 min-h-screen text-gray-900 overflow-x-hidden pb-12 md:pb-0">
        {children}
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
