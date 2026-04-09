'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Product = {
  id: string;
  name: string;
  categoryName: string;
  unitPrice: number;
  stockQuantity: number;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isVisibleOnStorefront: boolean;
  shops: { shopId: string }[];
};

function createEmptyForm() {
  return {
    name: '',
    categoryName: '',
    unitPrice: 0,
    stockQuantity: 0,
    sku: '',
    barcode: '',
    description: '',
    imageUrl: '',
    isActive: true,
    isVisibleOnStorefront: true,
  };
}

export default function ProductsClient({
  initialProducts,
  selectedShopId,
  shopName,
}: {
  initialProducts: Product[];
  selectedShopId: string | null;
  shopName: string | null;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return products;
    return products.filter((product) =>
      [product.name, product.categoryName, product.sku || '', product.barcode || '']
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [products, query]);

  const openCreate = () => {
    setSelected(null);
    setForm(createEmptyForm());
  };

  const openEdit = (product: Product) => {
    setSelected(product);
    setForm({
      name: product.name,
      categoryName: product.categoryName,
      unitPrice: product.unitPrice,
      stockQuantity: product.stockQuantity,
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      isActive: product.isActive,
      isVisibleOnStorefront: product.isVisibleOnStorefront,
    });
  };

  const clear = () => {
    setSelected(null);
    setForm(createEmptyForm());
  };

  const save = async () => {
    if (!form.name.trim() || !form.categoryName.trim()) {
      toast.error('商品名とカテゴリは必須です。');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        selected ? `/api/admin/pos/products/${selected.id}` : '/api/admin/pos/products',
        {
          method: selected ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            shopId: selectedShopId,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '商品の保存に失敗しました。');

      setProducts((current) =>
        selected
          ? current.map((item) => (item.id === data.id ? data : item))
          : [...current, data],
      );
      setSelected(data);
      toast.success(selected ? '商品を更新しました。' : '商品を作成しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '商品の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!selected) return;
    if (!window.confirm(`「${selected.name}」をアーカイブしますか？`)) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/pos/products/${selected.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || '商品のアーカイブに失敗しました。');

      setProducts((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, isActive: false } : item,
        ),
      );
      toast.success('商品をアーカイブしました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '商品のアーカイブに失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">店販商品</h1>
          <p className="mt-1 text-sm text-slate-500">
            {shopName ? `${shopName} の商品一覧` : '全店舗の商品一覧を管理します。'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          新規商品
        </button>
      </div>

      <div className="mb-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="商品名、カテゴリ、SKU、バーコードで検索"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">商品が見つかりません。</div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openEdit(product)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${
                    selected?.id === product.id ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.categoryName} ・ ¥{product.unitPrice.toLocaleString()} ・ 在庫 {product.stockQuantity}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[11px]">
                    <span
                      className={`rounded-full px-2 py-1 ${
                        product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {product.isActive ? '有効' : 'アーカイブ'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 ${
                        product.isVisibleOnStorefront
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {product.isVisibleOnStorefront ? '公開中' : '非公開'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">
              {selected ? '商品を編集' : '商品を作成'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              価格、在庫、画像 URL、公開状態を設定します。
            </p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">商品名</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">カテゴリ</span>
              <input
                value={form.categoryName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, categoryName: event.target.value }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">価格</span>
                <input
                  type="number"
                  value={form.unitPrice}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unitPrice: Number(event.target.value) }))
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">在庫数</span>
                <input
                  type="number"
                  value={form.stockQuantity}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stockQuantity: Number(event.target.value) }))
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">SKU</span>
                <input
                  value={form.sku}
                  onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">バーコード</span>
                <input
                  value={form.barcode}
                  onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">画像 URL</span>
              <input
                value={form.imageUrl}
                onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">説明文</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              商品を有効にする
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isVisibleOnStorefront}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isVisibleOnStorefront: event.target.checked }))
                }
              />
              サイトで公開する
            </label>

            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : selected ? '商品を更新' : '商品を作成'}
              </button>
              {selected ? (
                <button
                  onClick={archive}
                  disabled={saving}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  アーカイブ
                </button>
              ) : null}
              <button
                onClick={clear}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                クリア
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
