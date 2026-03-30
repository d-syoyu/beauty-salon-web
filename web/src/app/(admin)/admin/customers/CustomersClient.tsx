'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { CATEGORY_COLORS } from '@/constants/menu';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PageHeader } from '@/components/admin/PageHeader';

export interface ReservationItem {
  id: string;
  menuName: string;
  category: string;
  price: number;
  duration: number;
}

export interface Reservation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  totalDuration: number;
  menuSummary: string;
  status: string;
  items: ReservationItem[];
}

export interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  newsletterOptOut: boolean;
  reservations: Reservation[];
  completedCount: number;
}

const INITIAL_VISIBLE = 5;
const LOAD_MORE_COUNT = 10;

export default function CustomersClient({
  customers,
  page,
  totalPages,
  searchQuery: initialSearch,
}: {
  customers: Customer[];
  page: number;
  totalPages: number;
  searchQuery: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });
  const [editError, setEditError] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const navigate = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.page && params.page !== '1') sp.set('page', params.page);
    startTransition(() => {
      router.push(`/admin/customers?${sp.toString()}`);
    });
  };

  const handleSearch = () => navigate({ search: searchQuery, page: '1' });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${weekdays[date.getDay()]}）`;
  };

  const toggleCustomer = (customerId: string) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(customerId);
      if (!visibleCounts[customerId]) {
        setVisibleCounts(prev => ({ ...prev, [customerId]: INITIAL_VISIBLE }));
      }
    }
  };

  const loadMore = (customerId: string) => {
    setVisibleCounts(prev => ({ ...prev, [customerId]: (prev[customerId] || INITIAL_VISIBLE) + LOAD_MORE_COUNT }));
  };

  const getVisibleReservations = (customer: Customer) => {
    const count = visibleCounts[customer.id] || INITIAL_VISIBLE;
    return customer.reservations.slice(0, count);
  };

  const getTotalRevenue = (reservations: Reservation[]) => {
    return reservations.filter(r => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW').reduce((sum, r) => sum + r.totalPrice, 0);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setIsAddModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({ name: customer.name || '', phone: customer.phone || '', email: customer.email || '' });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setIsSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setIsEditModalOpen(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    try {
      const res = await fetch(`/api/admin/customers/${deletingCustomer.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setIsDeleteDialogOpen(false);
      setDeletingCustomer(null);
      router.refresh();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="顧客管理" description="顧客情報・予約履歴">
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" />顧客追加
        </Button>
      </PageHeader>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="名前・電話番号・メールアドレスで検索"
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button size="sm" className="h-9" onClick={handleSearch}>
              <Search className="w-3.5 h-3.5 mr-1.5" />検索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <div className="divide-y divide-border">
          {customers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">顧客がいません</div>
          ) : customers.map((customer) => (
            <div key={customer.id}>
              <div
                className="p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleCustomer(customer.id)}
              >
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className="text-xs bg-muted">
                    {customer.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{customer.name || '名前未登録'}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>}
                    {customer.email && <span className="hidden sm:flex items-center gap-1"><Mail className="w-3 h-3" /><span className="truncate max-w-[180px]">{customer.email}</span></span>}
                  </div>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-medium">{customer.completedCount}回</p>
                  <p className="text-xs text-muted-foreground">¥{getTotalRevenue(customer.reservations).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <Button variant="outline" size="sm" className="h-7 text-xs">詳細</Button>
                  </Link>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                    onClick={(e) => { e.stopPropagation(); openEditModal(customer); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); setDeletingCustomer(customer); setIsDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedCustomerId === customer.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {expandedCustomerId === customer.id && (
                <div className="px-4 pb-4 bg-muted/30">
                  <div className="space-y-2">
                    {getVisibleReservations(customer).map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                        <div className="shrink-0 w-28">
                          <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
                          <p className="text-sm font-medium">{r.startTime}~{r.endTime}</p>
                        </div>
                        <div className="flex gap-0.5 w-10 shrink-0">
                          {r.items.map((item) => (
                            <div key={item.id} className="h-4 rounded" style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#888', flex: item.duration }} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{r.menuSummary}</p>
                        </div>
                        <StatusBadge status={r.status} />
                        <span className="text-sm text-amber-600 shrink-0">¥{r.totalPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  {customer.reservations.length > (visibleCounts[customer.id] || INITIAL_VISIBLE) && (
                    <Button
                      variant="ghost" size="sm" className="mt-2 w-full text-xs h-8"
                      onClick={() => loadMore(customer.id)}
                    >
                      さらに表示
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => navigate({ search: initialSearch, page: String(page - 1) })}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => navigate({ search: initialSearch, page: String(page + 1) })}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>顧客追加</DialogTitle></DialogHeader>
          {addError && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{addError}</div>}
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">名前</Label>
              <Input id="add-name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-phone">電話番号</Label>
              <Input id="add-phone" type="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">メールアドレス</Label>
              <Input id="add-email" type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '登録中...' : '登録'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>顧客編集</DialogTitle></DialogHeader>
          {editError && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{editError}</div>}
          <form onSubmit={handleEditCustomer} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">名前</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">電話番号</Label>
              <Input id="edit-phone" type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">メールアドレス</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '更新中...' : '更新'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="顧客削除"
        description={`「${deletingCustomer?.name || '名前未登録'}」を削除しますか？予約データも全て削除されます。`}
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={handleDeleteCustomer}
      />
    </div>
  );
}
