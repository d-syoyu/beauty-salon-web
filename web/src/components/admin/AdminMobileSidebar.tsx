'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent, type Shop } from '@/components/admin/AdminSidebarContent';
import type { CurrentUser } from '@/components/admin/AdminSidebar';

export function AdminMobileSidebar({
  shops,
  selectedShopId,
  currentUser,
  storefrontUrl,
  showGbpReviews,
}: {
  shops: Shop[];
  selectedShopId: string | null;
  currentUser: CurrentUser;
  storefrontUrl?: string | null;
  showGbpReviews?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger
        id="admin-sidebar-sheet-trigger"
        className="fixed right-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white shadow-sm transition-colors hover:bg-accent md:hidden"
        aria-label="管理メニューを開く"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SidebarContent
          onClose={() => setMobileOpen(false)}
          shops={shops}
          selectedShopId={selectedShopId}
          currentUser={currentUser}
          storefrontUrl={storefrontUrl}
          showGbpReviews={showGbpReviews}
        />
      </SheetContent>
    </Sheet>
  );
}
