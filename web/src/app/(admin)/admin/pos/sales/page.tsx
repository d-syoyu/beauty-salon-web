'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Receipt,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface SaleItem {
  id: string;
  itemType: string;
  menuName: string | null;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string | null;
  saleDate: string;
  saleTime: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  couponDiscount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  note: string | null;
  items: SaleItem[];
  user: { name: string | null; phone: string | null } | null;
  coupon: { code: string; name: string } | null;
  createdByUser: { name: string | null } | null;
}

interface Menu {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: { name: string; id: string };
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: '現金',
  CREDIT_CARD: 'クレジットカード',
  PAYPAY: 'PayPay',
  LINE_PAY: 'LINE Pay',
  BANK_TRANSFER: '銀行振込',
  OTHER: 'その他',
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PAID: { label: '支払済', color: 'bg-green-100 text-green-700' },
  PENDING: { label: '未払い', color: 'bg-yellow-100 text-yellow-700' },
  REFUNDED: { label: '返金済', color: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: '取消', color: 'bg-gray-100 text-gray-500' },
};

export default function AdminSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);

  // Create form
  const [saleForm, setSaleForm] = useState({
    customerName: '',
    customerPhone: '',
    paymentMethod: 'CASH',
    note: '',
  });
  const [saleItems, setSaleItems] = useState<{ menuId: string; menuName: string; unitPrice: number; quantity: number; category: string; categoryId: string; duration: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchSales();
    fetchMenus();
  }, []);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (paymentFilter) params.set('paymentMethod', paymentFilter);
      params.set('limit', '100');
      const res = await fetch(`/api/admin/sales?${params}`);
      const data = await res.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch sales:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMenus = async () => {
    try {
      const res = await fetch('/api/admin/menus');
      const data = await res.json();
      setMenus(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to fetch menus:', err); }
  };

  const addSaleItem = (menu: Menu) => {
    const existing = saleItems.find(i => i.menuId === menu.id);
    if (existing) {
      setSaleItems(saleItems.map(i => i.menuId === menu.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setSaleItems([...saleItems, {
        menuId: menu.id, menuName: menu.name, unitPrice: menu.price,
        quantity: 1, category: menu.category.name, categoryId: menu.category.id, duration: menu.duration,
      }]);
    }
  };

  const removeSaleItem = (menuId: string) => {
    setSaleItems(saleItems.filter(i => i.menuId !== menuId));
  };

  const saleTotal = saleItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleItems.length === 0) { setCreateError('メニューを選択してください'); return; }
    setIsSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...saleForm,
          items: saleItems.map(i => ({
            itemType: 'MENU',
            menuId: i.menuId,
            menuName: i.menuName,
            categoryId: i.categoryId,
            category: i.category,
            duration: i.duration,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setIsCreateModalOpen(false);
      setSaleItems([]);
      setSaleForm({ customerName: '', customerPhone: '', paymentMethod: 'CASH', note: '' });
      fetchSales();
    } catch (err) { setCreateError(err instanceof Error ? err.message : 'エラーが発生しました'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteSale = async () => {
    if (!deletingSale) return;
    try {
      const res = await fetch(`/api/admin/sales/${deletingSale.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setIsDeleteModalOpen(false);
      setDeletingSale(null);
      fetchSales();
    } catch (err) { console.error('Delete failed:', err); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/pos" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
            <div>
              <h1 className="text-2xl font-medium flex items-center gap-2"><Receipt className="w-6 h-6" /> 売上管理</h1>
              <p className="text-sm text-gray-500 mt-1">会計の作成・管理</p>
            </div>
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
            <Plus className="w-4 h-4" /> 新規会計
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <span className="text-gray-400">〜</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="">すべての決済</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={fetchSales} className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
              <Search className="w-4 h-4 inline mr-1" /> 検索
            </button>
          </div>
        </div>

        {/* Sales List */}
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">読み込み中...</div>
          ) : sales.length === 0 ? (
            <div className="p-12 text-center text-gray-500">売上がありません</div>
          ) : sales.map((sale) => (
            <div key={sale.id} className="p-4 md:p-5 flex items-center gap-4">
              <div className="flex-shrink-0 w-20">
                <p className="text-xs text-gray-500">{formatDate(sale.saleDate)}</p>
                <p className="text-sm font-medium">{sale.saleTime}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${PAYMENT_STATUS_LABELS[sale.paymentStatus]?.color || ''}`}>
                    {PAYMENT_STATUS_LABELS[sale.paymentStatus]?.label || sale.paymentStatus}
                  </span>
                  <span className="text-xs text-gray-400">{sale.saleNumber}</span>
                </div>
                <p className="text-sm truncate">{sale.items.map(i => i.menuName || i.productName).join(', ')}</p>
                <p className="text-xs text-gray-500">
                  {sale.customerName || sale.user?.name || 'ウォークイン'}
                  {' / '}{PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}
                  {sale.coupon && ` / クーポン: ${sale.coupon.code}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-medium text-amber-600">¥{sale.totalAmount.toLocaleString()}</p>
                {sale.discountAmount > 0 && <p className="text-xs text-red-500">-¥{sale.discountAmount.toLocaleString()}</p>}
              </div>
              <button onClick={() => { setDeletingSale(sale); setIsDeleteModalOpen(true); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Sale Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-6">新規会計</h3>
            {createError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{createError}</div>}
            <form onSubmit={handleCreateSale} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-600 mb-1">お客様名</label><input type="text" value={saleForm.customerName} onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" placeholder="ウォークイン" /></div>
                <div><label className="block text-sm text-gray-600 mb-1">決済方法</label>
                  <select value={saleForm.paymentMethod} onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Menu selection */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">メニューを選択</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {menus.map((menu) => (
                    <button key={menu.id} type="button" onClick={() => addSaleItem(menu)}
                      className="text-left p-2 rounded-lg hover:bg-gray-50 border border-gray-100 text-xs">
                      <p className="font-medium truncate">{menu.name}</p>
                      <p className="text-gray-500">¥{menu.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected items */}
              {saleItems.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-600 mb-2">選択済みメニュー</label>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {saleItems.map((item) => (
                      <div key={item.menuId} className="p-3 flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.menuName}</p>
                          <p className="text-xs text-gray-500">¥{item.unitPrice.toLocaleString()} x {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium">¥{(item.unitPrice * item.quantity).toLocaleString()}</p>
                        <button type="button" onClick={() => removeSaleItem(item.menuId)} className="p-1 text-red-400 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div className="p-3 flex justify-between font-medium">
                      <span>合計</span>
                      <span className="text-amber-600">¥{saleTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">備考</label>
                <input type="text" value={saleForm.note} onChange={(e) => setSaleForm({ ...saleForm, note: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" disabled={isSubmitting || saleItems.length === 0} className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">{isSubmitting ? '作成中...' : '会計を作成'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {isDeleteModalOpen && deletingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-xl font-medium">売上削除</h3>
            </div>
            <p className="text-gray-600 mb-6">会計 {deletingSale.saleNumber} （¥{deletingSale.totalAmount.toLocaleString()}）を削除しますか？</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDeleteSale} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
