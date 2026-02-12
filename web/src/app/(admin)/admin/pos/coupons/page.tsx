'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Ticket,
  AlertTriangle,
  Check,
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  description: string | null;
  applicableMenuIds: string;
  applicableCategoryIds: string;
  applicableWeekdays: string;
  startTime: string | null;
  endTime: string | null;
  onlyFirstTime: boolean;
  onlyReturning: boolean;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  usageCount: number;
  minimumAmount: number | null;
  isActive: boolean;
  _count: { usages: number; sales: number };
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  const [form, setForm] = useState({
    code: '', name: '', type: 'PERCENTAGE' as string, value: 10, description: '',
    validFrom: '', validUntil: '', usageLimit: '', usageLimitPerCustomer: '', minimumAmount: '',
    onlyFirstTime: false, onlyReturning: false, isActive: true,
  });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed:', err); } finally { setIsLoading(false); }
  };

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000); };

  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setForm({
        code: coupon.code, name: coupon.name, type: coupon.type, value: coupon.value,
        description: coupon.description || '',
        validFrom: coupon.validFrom.slice(0, 10), validUntil: coupon.validUntil.slice(0, 10),
        usageLimit: coupon.usageLimit !== null ? String(coupon.usageLimit) : '',
        usageLimitPerCustomer: coupon.usageLimitPerCustomer !== null ? String(coupon.usageLimitPerCustomer) : '',
        minimumAmount: coupon.minimumAmount !== null ? String(coupon.minimumAmount) : '',
        onlyFirstTime: coupon.onlyFirstTime, onlyReturning: coupon.onlyReturning, isActive: coupon.isActive,
      });
    } else {
      setEditingCoupon(null);
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const monthLater = new Date(); monthLater.setMonth(monthLater.getMonth() + 1);
      setForm({
        code: '', name: '', type: 'PERCENTAGE', value: 10, description: '',
        validFrom: tomorrow.toISOString().slice(0, 10), validUntil: monthLater.toISOString().slice(0, 10),
        usageLimit: '', usageLimitPerCustomer: '', minimumAmount: '',
        onlyFirstTime: false, onlyReturning: false, isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';
      const body = {
        ...form,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        usageLimitPerCustomer: form.usageLimitPerCustomer ? Number(form.usageLimitPerCustomer) : null,
        minimumAmount: form.minimumAmount ? Number(form.minimumAmount) : null,
      };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      showSuccess(editingCoupon ? 'クーポンを更新しました' : 'クーポンを作成しました');
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  const handleDelete = async () => {
    if (!deletingCoupon) return;
    try {
      const res = await fetch(`/api/admin/coupons/${deletingCoupon.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      showSuccess('クーポンを削除しました');
      setIsDeleteModalOpen(false);
      setDeletingCoupon(null);
      fetchCoupons();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  const isExpired = (coupon: Coupon) => new Date(coupon.validUntil) < new Date();
  const isReachedLimit = (coupon: Coupon) => coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.isActive) return { label: '無効', color: 'bg-gray-100 text-gray-500' };
    if (isExpired(coupon)) return { label: '期限切れ', color: 'bg-red-100 text-red-700' };
    if (isReachedLimit(coupon)) return { label: '上限到達', color: 'bg-yellow-100 text-yellow-700' };
    return { label: '有効', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/pos" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
            <div>
              <h1 className="text-2xl font-medium flex items-center gap-2"><Ticket className="w-6 h-6" /> クーポン管理</h1>
              <p className="text-sm text-gray-500 mt-1">クーポンの作成・管理</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
            <Plus className="w-4 h-4" /> クーポン作成
          </button>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">{success}</div>}

        {/* Coupons List */}
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">読み込み中...</div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center text-gray-500">クーポンがありません</div>
          ) : coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            return (
              <div key={coupon.id} className="p-4 md:p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold bg-gray-100 px-2 py-0.5 rounded">{coupon.code}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>{status.label}</span>
                  </div>
                  <p className="font-medium text-sm">{coupon.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{coupon.type === 'PERCENTAGE' ? `${coupon.value}%OFF` : `¥${coupon.value.toLocaleString()}OFF`}</span>
                    <span>{coupon.validFrom.slice(0, 10)} ~ {coupon.validUntil.slice(0, 10)}</span>
                    <span>利用: {coupon.usageCount}{coupon.usageLimit !== null ? `/${coupon.usageLimit}` : ''}回</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openModal(coupon)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => { setDeletingCoupon(coupon); setIsDeleteModalOpen(true); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-6">{editingCoupon ? 'クーポン編集' : 'クーポン作成'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-600 mb-1">コード</label><input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono" placeholder="WELCOME10" /></div>
                <div><label className="block text-sm text-gray-600 mb-1">名前</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-600 mb-1">割引タイプ</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="PERCENTAGE">割合（%）</option>
                    <option value="FIXED">固定額（円）</option>
                  </select>
                </div>
                <div><label className="block text-sm text-gray-600 mb-1">{form.type === 'PERCENTAGE' ? '割引率（%）' : '割引額（円）'}</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm text-gray-600 mb-1">説明</label><input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-600 mb-1">有効開始日</label><input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
                <div><label className="block text-sm text-gray-600 mb-1">有効終了日</label><input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm text-gray-600 mb-1">利用上限</label><input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" placeholder="無制限" /></div>
                <div><label className="block text-sm text-gray-600 mb-1">顧客上限</label><input type="number" value={form.usageLimitPerCustomer} onChange={(e) => setForm({ ...form, usageLimitPerCustomer: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" placeholder="無制限" /></div>
                <div><label className="block text-sm text-gray-600 mb-1">最低金額</label><input type="number" value={form.minimumAmount} onChange={(e) => setForm({ ...form, minimumAmount: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" placeholder="なし" /></div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-600">有効</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.onlyFirstTime} onChange={(e) => setForm({ ...form, onlyFirstTime: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-600">初回限定</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.onlyReturning} onChange={(e) => setForm({ ...form, onlyReturning: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-600">リピーター限定</span></label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"><Check className="w-4 h-4 inline mr-1" />{editingCoupon ? '更新' : '作成'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {isDeleteModalOpen && deletingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-xl font-medium">クーポン削除</h3>
            </div>
            <p className="text-gray-600 mb-6">クーポン「{deletingCoupon.code}」を削除しますか？</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
