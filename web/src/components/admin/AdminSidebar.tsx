'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  UtensilsCrossed,
  CalendarOff,
  CreditCard,
  Mail,
  ChevronRight,
  Scissors as ScissorsIcon,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'ダッシュボード',
    href: '/admin',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: '予約管理',
    href: '/admin/reservations',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    label: '顧客管理',
    href: '/admin/customers',
    icon: <Users className="w-4 h-4" />,
  },
  {
    label: 'スタッフ管理',
    href: '/admin/staff',
    icon: <Scissors className="w-4 h-4" />,
    children: [
      { label: '今日の勤怠', href: '/admin/staff' },
      { label: 'スタッフ一覧', href: '/admin/staff/list' },
      { label: '月次シフト', href: '/admin/staff/monthly' },
      { label: '申請承認', href: '/admin/requests' },
    ],
  },
  {
    label: 'メニュー管理',
    href: '/admin/menus',
    icon: <UtensilsCrossed className="w-4 h-4" />,
  },
  {
    label: '休日・特別時間',
    href: '/admin/holidays',
    icon: <CalendarOff className="w-4 h-4" />,
  },
  {
    label: 'POS・会計',
    href: '/admin/pos',
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    label: 'メルマガ',
    href: '/admin/newsletter',
    icon: <Mail className="w-4 h-4" />,
  },
];

function SidebarContent({
  onClose,
  collapsed = false,
}: {
  onClose?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-sidebar-border overflow-hidden">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <ScissorsIcon className="w-4 h-4 text-primary-foreground" />
        </div>
        {collapsed ? (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 overflow-hidden whitespace-nowrap">
            <p className="text-sm font-semibold leading-tight">LUMINA</p>
            <p className="text-xs text-muted-foreground leading-tight">管理画面</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold leading-tight">LUMINA</p>
            <p className="text-xs text-muted-foreground leading-tight">管理画面</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const childActive =
            hasChildren &&
            item.children!.some(
              (c) => pathname === c.href || pathname.startsWith(c.href)
            );

          return (
            <div key={item.href} className="mb-0.5">
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  `flex items-center gap-3 px-3 ${collapsed ? 'py-2' : 'py-3'} rounded-md text-sm transition-colors`,
                  active || childActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {collapsed ? (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-1 overflow-hidden whitespace-nowrap">
                    {item.label}
                  </span>
                ) : (
                  <span className="flex-1">{item.label}</span>
                )}
                {hasChildren && !collapsed && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                )}
                {hasChildren && collapsed && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                )}
              </Link>

              {/* Sub-items */}
              {hasChildren && (active || childActive) && (
                <div
                  className={cn(
                    'ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3',
                    collapsed &&
                      'opacity-0 group-hover:opacity-100 transition-opacity duration-150 overflow-hidden'
                  )}
                >
                  {item.children!.map((child) => {
                    const childIsActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          `flex items-center px-2 ${collapsed ? 'py-1.5' : 'py-2.5'} rounded-md text-xs transition-colors whitespace-nowrap`,
                          childIsActive
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border overflow-hidden">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          {collapsed ? (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 overflow-hidden whitespace-nowrap">
              サイトへ戻る
            </span>
          ) : (
            <span>サイトへ戻る</span>
          )}
        </Link>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  return (
    <>
      {/* Desktop: icon rail, hover to expand */}
      <aside
        className={cn(
          'group hidden lg:flex flex-col',
          'fixed top-0 left-0 h-screen z-30',
          'bg-card border-r border-border',
          'w-14 hover:w-56 overflow-hidden',
          'transition-[width] duration-200 ease-in-out'
        )}
      >
        <SidebarContent collapsed />
      </aside>

      {/* Mobile: hamburger + Sheet drawer */}
      <Sheet>
        <SheetTrigger
          className="lg:hidden fixed top-3 right-3 z-50 inline-flex items-center justify-center h-10 w-10 rounded-md bg-white shadow-sm border border-border hover:bg-accent transition-colors"
          aria-label="メニューを開く"
        >
          <Menu className="w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
