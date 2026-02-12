// src/app/(admin)/admin/layout.tsx
// Admin Layout - Auto guest auth, session cleared on tab close

import SessionProvider from "@/components/providers/session-provider";
import AdminAutoAuth from "@/components/admin/AdminAutoAuth";

export const metadata = {
  title: "Admin | LUMINA HAIR STUDIO",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminAutoAuth>
        <div className="admin-page bg-gray-50 min-h-screen text-gray-900">
          {children}
        </div>
      </AdminAutoAuth>
    </SessionProvider>
  );
}
