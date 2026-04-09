'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CalendarOff,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  Package,
  Scissors,
  Settings,
  Store,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { dispatchAdminShopChanged } from '@/lib/admin-shop-client';
import { cn } from '@/lib/utils';

export interface Shop {
  id: string;
  name: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: 'ダッシュボード', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: '予約', href: '/admin/reservations', icon: <Calendar className="h-4 w-4" /> },
  { label: '顧客', href: '/admin/customers', icon: <Users className="h-4 w-4" /> },
  {
    label: 'スタッフ',
    href: '/admin/staff',
    icon: <Scissors className="h-4 w-4" />,
    children: [
      { label: '日次業務', href: '/admin/staff' },
      { label: 'スタッフ一覧', href: '/admin/staff/list' },
      { label: '月次表示', href: '/admin/staff/monthly' },
      { label: '申請一覧', href: '/admin/requests' },
    ],
  },
  { label: 'メニュー', href: '/admin/menus', icon: <UtensilsCrossed className="h-4 w-4" /> },
  { label: '休業日', href: '/admin/holidays', icon: <CalendarOff className="h-4 w-4" /> },
  {
    label: 'POS',
    href: '/admin/pos',
    icon: <CreditCard className="h-4 w-4" />,
    children: [
      { label: 'ダッシュボード', href: '/admin/pos' },
      { label: '締め処理', href: '/admin/pos/closing' },
    ],
  },
  { label: 'キャンペーン', href: '/admin/campaigns', icon: <Megaphone className="h-4 w-4" /> },
  { label: 'ギャラリー', href: '/admin/gallery', icon: <ImageIcon className="h-4 w-4" /> },
  { label: '店販商品', href: '/admin/products', icon: <Package className="h-4 w-4" /> },
  { label: '店舗', href: '/admin/shops', icon: <Store className="h-4 w-4" /> },
  {
    label: '設定',
    href: '/admin/settings',
    icon: <Settings className="h-4 w-4" />,
    children: [
      { label: '予約設定', href: '/admin/settings/booking' },
      { label: 'LINE', href: '/admin/settings/line' },
      { label: 'Google Business', href: '/admin/settings/google-business' },
      { label: 'パスワード', href: '/admin/settings/password' },
    ],
  },
];

function ShopSelector({
  shops,
  selectedShopId: initialShopId,
  collapsed,
}: {
  shops: Shop[];
  selectedShopId: string | null;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const [activeShopId, setActiveShopId] = useState<string | null>(initialShopId);

  useEffect(() => {
    setActiveShopId(initialShopId);
  }, [initialShopId]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const currentShop = shops.find((shop) => shop.id === activeShopId) ?? null;
  const label = currentShop?.name ?? '全店舗';

  const toggleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 180),
        zIndex: 9999,
      });
    }
    setOpen((value) => !value);
  };

  const selectShop = (shopId: string | null) => {
    setOpen(false);
    setActiveShopId(shopId);

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/shops/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId }),
        });
        if (!response.ok) {
          setActiveShopId(initialShopId);
          return;
        }
        dispatchAdminShopChanged(shopId);
        router.refresh();
      } catch {
        setActiveShopId(initialShopId);
      }
    });
  };

  if (shops.length === 0) return null;

  return (
    <div className="px-2 pb-2">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        disabled={isPending}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
          'bg-muted/60 transition-colors hover:bg-muted',
          isPending && 'opacity-50',
        )}
      >
        <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            'flex-1 truncate transition-opacity duration-150',
            collapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
          )}
        >
          {label}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 text-muted-foreground transition-opacity',
            collapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
          )}
        />
      </button>

      {open ? (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-md border border-border bg-popover py-1 shadow-md"
        >
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              selectShop(null);
            }}
            className={cn(
              'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
              !activeShopId && 'font-medium text-primary',
            )}
          >
            全店舗
          </button>
          {shops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                selectShop(shop.id);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                activeShopId === shop.id && 'font-medium text-primary',
              )}
            >
              {shop.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface SidebarContentProps {
  onClose?: () => void;
  collapsed?: boolean;
  shops: Shop[];
  selectedShopId: string | null;
}

export function SidebarContent({
  onClose,
  collapsed = false,
  shops,
  selectedShopId,
}: SidebarContentProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="overflow-hidden border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Scissors className="h-4 w-4 text-primary-foreground" />
          </div>
          {collapsed ? (
            <div className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <p className="text-sm font-semibold leading-tight">LUMINA</p>
              <p className="text-xs leading-tight text-muted-foreground">管理画面</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold leading-tight">LUMINA</p>
              <p className="text-xs leading-tight text-muted-foreground">管理画面</p>
            </div>
          )}
        </div>
      </div>

      {shops.length > 0 ? (
        <div className={cn('border-b border-border pt-2', collapsed && 'overflow-hidden')}>
          <ShopSelector shops={shops} selectedShopId={selectedShopId} collapsed={collapsed} />
        </div>
      ) : null}

      <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const hasChildren = Boolean(item.children?.length);
          const childActive =
            hasChildren &&
            item.children!.some(
              (child) => pathname === child.href || pathname.startsWith(child.href),
            );

          return (
            <div key={item.href} className="mb-0.5">
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center rounded-md text-sm transition-colors',
                  collapsed
                    ? 'mx-auto h-10 w-10 justify-center gap-0 px-0 py-0 group-hover:w-full group-hover:justify-start group-hover:gap-3 group-hover:px-3'
                    : 'gap-3 px-3 py-3',
                  active || childActive
                    ? 'bg-primary font-medium text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {collapsed ? (
                  <span className="hidden flex-1 overflow-hidden whitespace-nowrap group-hover:block">
                    {item.label}
                  </span>
                ) : (
                  <span className="flex-1">{item.label}</span>
                )}
                {hasChildren && !collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                ) : null}
                {hasChildren && collapsed ? (
                  <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 opacity-50 group-hover:block" />
                ) : null}
              </Link>

              {hasChildren && (active || childActive) ? (
                <div
                  className={cn(
                    'ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3',
                    collapsed &&
                      'overflow-hidden opacity-0 transition-opacity duration-150 group-hover:opacity-100',
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
                          `flex items-center rounded-md px-2 ${collapsed ? 'py-1.5' : 'py-2.5'} text-xs whitespace-nowrap transition-colors`,
                          childIsActive
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="overflow-hidden border-t border-sidebar-border px-3 py-3">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          {collapsed ? (
            <span className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              サイトに戻る
            </span>
          ) : (
            <span>サイトに戻る</span>
          )}
        </Link>
      </div>
    </div>
  );
}
