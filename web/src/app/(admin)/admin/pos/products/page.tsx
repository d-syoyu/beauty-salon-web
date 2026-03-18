'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Plus, Pencil, X, Check, AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  categoryName: string;
  unitPrice: number;
  stockQuantity: number;
  sku: string | null;
  description: string | null;
  isActive: boolean;
}

const emptyForm = (): Omit<Product, 'id' | 'isActive'> => ({
  name: '',
  categoryName: '',
  unitPrice: 0,
  stockQuantity: 0,
  sku: '',
  description: '',
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockAdjustId, setStockAdjustId] = useState<string | null>(null);
  const [stockAdjust, setStockAdjust] = useState(0);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/pos/products?limit=200');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, categoryName: p.categoryName, unitPrice: p.unitPrice, stockQuantity: p.stockQuantity, sku: p.sku || '', description: p.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.categoryName || !form.unitPrice) {
      setError('商品名、カテゴリ、単価は必須です');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const url = editingProduct ? `/api/admin/pos/products/${editingProduct.id}` : '/api/admin/pos/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, unitPrice: Number(form.unitPrice), stockQuantity: Number(form.stockQuantity) }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || '保存に失敗しました');
        return;
      }
      setShowModal(false);
      fetchProducts();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この商品を無効化しますか？')) return;
    await fetch(`/api/admin/pos/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  const handleStockAdjust = async (id: string) => {
    if (!stockAdjust) return;
    await fetch(`/api/admin/pos/products/${id}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment: Number(stockAdjust) }),
    });
    setStockAdjustId(null);
    setStockAdjust(0);
    fetchProducts();
  };

  const filtered = products.filter(p =>
    !search || p.name.includes(search) || p.categoryName.includes(search) || (p.sku || '').includes(search)
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/pos" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
            <div>
              <h1 className="text-2xl font-medium flex items-center gap-2"><Package className="w-6 h-6" />店販商品管理</h1>
              <p className="text-sm text-gray-500 mt-1">商品の登録・在庫管理</p>
            </div>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
            <Plus className="w-4 h-4" />新規商品
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="商品名・カテゴリ・SKUで検索..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-sage)]" />
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">商品がありません</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">商品名</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">カテゴリ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">単価</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">在庫</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(product => (
                  <tr key={product.id} className={product.isActive ? '' : 'opacity-40'}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{product.name}</p>
                      {product.sku && <p className="text-xs text-gray-400">SKU: {product.sku}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{product.categoryName}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">¥{product.unitPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {stockAdjustId === product.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={stockAdjust} onChange={e => setStockAdjust(Number(e.target.value))}
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm" />
                          <button onClick={() => handleStockAdjust(product.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setStockAdjustId(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setStockAdjustId(product.id); setStockAdjust(0); }}
                          className={`px-2 py-1 rounded text-sm font-medium hover:bg-gray-50 ${product.stockQuantity <= 0 ? 'text-red-500' : 'text-gray-700'}`}>
                          {product.stockQuantity}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(product)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-medium mb-4">{editingProduct ? '商品編集' : '新規商品登録'}</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名 <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ <span className="text-red-500">*</span></label>
                <input type="text" value={form.categoryName} onChange={e => setForm(f => ({ ...f, categoryName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]"
                  placeholder="例: シャンプー、トリートメント" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">単価（円）<span className="text-red-500">*</span></label>
                  <input type="number" min="0" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">初期在庫</label>
                  <input type="number" min="0" value={form.stockQuantity} onChange={e => setForm(f => ({ ...f, stockQuantity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU（任意）</label>
                <input type="text" value={form.sku || ''} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
