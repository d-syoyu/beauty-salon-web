'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Settings,
  Trash2,
  Edit2,
  X,
  Check,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  code: string;
  displayName: string;
  isActive: boolean;
  displayOrder: number;
}

interface SettingsData {
  taxRate: number;
}

export default function POSSettingsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [settings, setSettings] = useState<SettingsData>({ taxRate: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Payment method modal
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodForm, setMethodForm] = useState({ code: '', displayName: '', isActive: true, displayOrder: 0 });

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);

  // Tax rate editing
  const [editTaxRate, setEditTaxRate] = useState(10);
  const [isSavingTax, setIsSavingTax] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [methodsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/payment-methods'),
        fetch('/api/admin/settings'),
      ]);
      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(Array.isArray(data) ? data : []);
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
        setEditTaxRate(data.taxRate || 10);
      }
    } catch (err) { console.error('Failed to fetch:', err); } finally { setIsLoading(false); }
  };

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000); };

  const openMethodModal = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setMethodForm({ code: method.code, displayName: method.displayName, isActive: method.isActive, displayOrder: method.displayOrder });
    } else {
      setEditingMethod(null);
      setMethodForm({ code: '', displayName: '', isActive: true, displayOrder: paymentMethods.length });
    }
    setIsMethodModalOpen(true);
  };

  const handleMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMethod) {
        const res = await fetch('/api/admin/payment-methods', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingMethod.id, ...methodForm }),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
        showSuccess('決済方法を更新しました');
      } else {
        const res = await fetch('/api/admin/payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(methodForm),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
        showSuccess('決済方法を追加しました');
      }
      setIsMethodModalOpen(false);
      fetchAll();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  const handleDeleteMethod = async () => {
    if (!deletingMethod) return;
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingMethod.id }),
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      showSuccess('決済方法を削除しました');
      setIsDeleteModalOpen(false);
      setDeletingMethod(null);
      fetchAll();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      await fetch('/api/admin/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: method.id, isActive: !method.isActive }),
      });
      fetchAll();
    } catch (err) { console.error('Toggle failed:', err); }
  };

  const handleSaveTaxRate = async () => {
    setIsSavingTax(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxRate: editTaxRate }),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      showSuccess('税率を保存しました');
      setSettings(prev => ({ ...prev, taxRate: editTaxRate }));
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); } finally { setIsSavingTax(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/pos" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium flex items-center gap-2"><Settings className="w-6 h-6" /> POS設定</h1>
            <p className="text-sm text-gray-500 mt-1">決済方法・税率の設定</p>
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">{success}</div>}

        {isLoading ? (
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            {/* Payment Methods */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-medium">決済方法</h2>
                <button onClick={() => openMethodModal()} className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
                  <Plus className="w-4 h-4" /> 追加
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {paymentMethods.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">決済方法が登録されていません</div>
                ) : paymentMethods.map((method) => (
                  <div key={method.id} className="p-4 flex items-center gap-4">
                    <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{method.displayName}</p>
                        <span className="text-xs text-gray-400 font-mono">{method.code}</span>
                        {!method.isActive && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">無効</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleToggleActive(method)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${method.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {method.isActive ? '有効' : '無効'}
                      </button>
                      <button onClick={() => openMethodModal(method)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { setDeletingMethod(method); setIsDeleteModalOpen(true); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax Rate */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">税率設定</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="number" value={editTaxRate} onChange={(e) => setEditTaxRate(Number(e.target.value))}
                    className="w-24 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-right" min={0} max={100} />
                  <span className="text-sm text-gray-600">%（税込価格に対する内税率）</span>
                </div>
                <button onClick={handleSaveTaxRate} disabled={isSavingTax}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50">
                  <Check className="w-4 h-4" /> {isSavingTax ? '保存中...' : '保存'}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Payment Method Modal */}
      {isMethodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMethodModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <button onClick={() => setIsMethodModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-6">{editingMethod ? '決済方法編集' : '決済方法追加'}</h3>
            <form onSubmit={handleMethodSubmit} className="space-y-4">
              <div><label className="block text-sm text-gray-600 mb-1">コード</label><input type="text" value={methodForm.code} onChange={(e) => setMethodForm({ ...methodForm, code: e.target.value.toUpperCase() })} required disabled={!!editingMethod} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono disabled:bg-gray-50" placeholder="CASH" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">表示名</label><input type="text" value={methodForm.displayName} onChange={(e) => setMethodForm({ ...methodForm, displayName: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" placeholder="現金" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-600 mb-1">表示順</label><input type="number" value={methodForm.displayOrder} onChange={(e) => setMethodForm({ ...methodForm, displayOrder: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" /></div>
                <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={methodForm.isActive} onChange={(e) => setMethodForm({ ...methodForm, isActive: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-600">有効</span></label></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsMethodModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"><Check className="w-4 h-4 inline mr-1" />{editingMethod ? '更新' : '追加'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Method Dialog */}
      {isDeleteModalOpen && deletingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-xl font-medium">決済方法削除</h3>
            </div>
            <p className="text-gray-600 mb-6">「{deletingMethod.displayName}」を削除しますか？</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDeleteMethod} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
