'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Search,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  X,
  UserPlus,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { CATEGORY_COLORS } from '@/constants/menu';

interface ReservationItem {
  id: string;
  menuName: string;
  category: string;
  price: number;
  duration: number;
}

interface Reservation {
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

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  newsletterOptOut: boolean;
  reservations: Reservation[];
  _count: {
    reservations: number;
    completedReservations: number;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: '確定', color: 'bg-green-100 text-green-700' },
  COMPLETED: { label: '完了', color: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'キャンセル', color: 'bg-gray-100 text-gray-500' },
  NO_SHOW: { label: '無断キャンセル', color: 'bg-red-100 text-red-700' },
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const INITIAL_VISIBLE = 5;
  const LOAD_MORE_COUNT = 10;

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

  useEffect(() => { fetchCustomers(); }, [page]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => { setPage(1); fetchCustomers(); };

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

  const getCompletedCount = (reservations: Reservation[]) => {
    return reservations.filter(r => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW').length;
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
      fetchCustomers();
    } catch (err) { setAddError(err instanceof Error ? err.message : 'エラーが発生しました'); } finally { setIsSubmitting(false); }
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
      fetchCustomers();
    } catch (err) { setEditError(err instanceof Error ? err.message : 'エラーが発生しました'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    try {
      const res = await fetch(`/api/admin/customers/${deletingCustomer.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setIsDeleteDialogOpen(false);
      setDeletingCustomer(null);
      fetchCustomers();
    } catch (err) { console.error('Delete failed:', err); }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-medium flex items-center gap-2">
                <Users className="w-6 h-6" /> 顧客管理
              </h1>
              <p className="text-sm text-gray-500 mt-1">顧客情報・予約履歴</p>
            </div>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
            <UserPlus className="w-4 h-4" /> 顧客追加
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="名前・電話番号・メールアドレスで検索"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <button onClick={handleSearch} className="px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">検索</button>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">読み込み中...</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">顧客がいません</div>
          ) : customers.map((customer) => (
            <div key={customer.id}>
              <div className="p-4 md:p-5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleCustomer(customer.id)}>
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">{customer.name?.charAt(0) || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{customer.name || '名前未登録'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>}
                    {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium">{getCompletedCount(customer.reservations)}回</p>
                  <p className="text-xs text-gray-500">¥{getTotalRevenue(customer.reservations).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(customer); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeletingCustomer(customer); setIsDeleteDialogOpen(true); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedCustomerId === customer.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Reservation History */}
              {expandedCustomerId === customer.id && (
                <div className="px-4 md:px-5 pb-4 bg-gray-50">
                  <div className="space-y-2">
                    {getVisibleReservations(customer).map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                        <div className="flex-shrink-0 w-28">
                          <p className="text-xs text-gray-500">{formatDate(r.date)}</p>
                          <p className="text-sm font-medium">{r.startTime}~{r.endTime}</p>
                        </div>
                        <div className="flex gap-0.5 w-10 flex-shrink-0">
                          {r.items.map((item) => (
                            <div key={item.id} className="h-4 rounded" style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#888', flex: item.duration }} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{r.menuSummary}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_LABELS[r.status]?.color || ''}`}>
                          {STATUS_LABELS[r.status]?.label || r.status}
                        </span>
                        <span className="text-sm text-amber-600 flex-shrink-0">¥{r.totalPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  {customer.reservations.length > (visibleCounts[customer.id] || INITIAL_VISIBLE) && (
                    <button onClick={() => loadMore(customer.id)} className="mt-2 w-full py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
                      さらに表示
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-gray-600">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-6">顧客追加</h3>
            {addError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{addError}</div>}
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div><label className="block text-sm text-gray-600 mb-1">名前</label><input type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">電話番号</label><input type="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">メールアドレス</label><input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">{isSubmitting ? '登録中...' : '登録'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-6">顧客編集</h3>
            {editError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{editError}</div>}
            <form onSubmit={handleEditCustomer} className="space-y-4">
              <div><label className="block text-sm text-gray-600 mb-1">名前</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">電話番号</label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">メールアドレス</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">{isSubmitting ? '更新中...' : '更新'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {isDeleteDialogOpen && deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDeleteDialogOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-xl font-medium">顧客削除</h3>
            </div>
            <p className="text-gray-600 mb-6">「{deletingCustomer.name || '名前未登録'}」を削除しますか？予約データも全て削除されます。</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDeleteCustomer} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
