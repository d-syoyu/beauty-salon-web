'use client';

import dynamic from 'next/dynamic';
import { SidebarContent, type Shop } from '@/components/admin/AdminSidebarContent';
import { cn } from '@/lib/utils';

const AdminMobileSidebar = dynamic(
  () => import('@/components/admin/AdminMobileSidebar').then((module) => module.AdminMobileSidebar),
  { ssr: false },
);

export function AdminSidebar({
  shops = [],
  selectedShopId = null,
}: {
  shops?: Shop[];
  selectedShopId?: string | null;
}) {
  return (
    <>
      <aside
        className={cn(
          'hidden md:flex xl:hidden flex-col',
          'fixed top-0 left-0 h-screen z-30',
          'w-56 bg-card border-r border-border',
        )}
      >
        <SidebarContent shops={shops} selectedShopId={selectedShopId} />
      </aside>

      <aside
        className={cn(
          'group hidden xl:flex flex-col',
          'fixed top-0 left-0 h-screen z-30',
          'bg-card border-r border-border',
          'w-14 hover:w-56 overflow-hidden',
        )}
      >
        <SidebarContent collapsed shops={shops} selectedShopId={selectedShopId} />
      </aside>

      <AdminMobileSidebar shops={shops} selectedShopId={selectedShopId} />
    </>
  );
}
