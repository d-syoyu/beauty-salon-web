'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent, type Shop } from '@/components/admin/AdminSidebarContent';

export function AdminMobileSidebar({
  shops,
  selectedShopId,
}: {
  shops: Shop[];
  selectedShopId: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        id="admin-sidebar-sheet-trigger"
        className="fixed right-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white shadow-sm transition-colors hover:bg-accent md:hidden"
        aria-label="Open admin menu"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SidebarContent
          onClose={() => setOpen(false)}
          shops={shops}
          selectedShopId={selectedShopId}
        />
      </SheetContent>
    </Sheet>
  );
}
