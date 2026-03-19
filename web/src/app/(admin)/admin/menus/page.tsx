'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Pencil,
  Package,
} from 'lucide-react';

const PRESET_COLORS = [
  { color: '#6B8E6B', name: 'グリーン' },
  { color: '#9F86C0', name: 'パープル' },
  { color: '#E0B1CB', name: 'ピンク' },
  { color: '#F4A261', name: 'オレンジ' },
  { color: '#98C1D9', name: 'ブルー' },
  { color: '#2A9D8F', name: 'ティール' },
  { color: '#ADB5BD', name: 'グレー' },
  { color: '#E63946', name: 'レッド' },
  { color: '#457B9D', name: 'ネイビー' },
  { color: '#B8956E', name: 'ブラウン' },
  { color: '#CB997E', name: 'ベージュ' },
  { color: '#7209B7', name: 'バイオレット' },
  { color: '#264653', name: 'ダークティール' },
  { color: '#E9C46A', name: 'イエロー' },
  { color: '#5A5550', name: 'チャコール' },
  { color: '#A89686', name: 'トープ' },
  { color: '#C8B6A6', name: 'サンド' },
  { color: '#780000', name: 'ワインレッド' },
  { color: '#606C38', name: 'モスグリーン' },
  { color: '#4A4E69', name: 'スチールグレー' },
];

interface Category {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
  menuCount?: number;
}

interface Menu {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  priceVariable: boolean;
  duration: number;
  lastBookingTime: string;
  displayOrder: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    nameEn: string;
    color: string;
  };
}

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

type TabType = 'menus' | 'products' | 'categories';

const emptyProductForm = () => ({
  name: '',
  categoryName: '',
  unitPrice: 0,
  stockQuantity: 0,
  sku: '',
  description: '',
});

function AdminMenusPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('menus');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'category' | 'menu'; id: string; name: string } | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '', nameEn: '', color: '#6B8E6B', displayOrder: 0, isActive: true,
  });

  const [menuForm, setMenuForm] = useState({
    name: '', categoryId: '', price: 0, priceVariable: false, duration: 60, lastBookingTime: '19:00', displayOrder: 0, isActive: true,
  });

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm());
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [stockAdjustId, setStockAdjustId] = useState<string | null>(null);
  const [stockAdjust, setStockAdjust] = useState(0);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'products') setActiveTab('products');
    else if (tab === 'categories') setActiveTab('categories');
  }, [searchParams]);

  useEffect(() => { fetchData(); fetchProducts(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, menuRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/menus?includeInactive=true'),
      ]);
      if (!catRes.ok || !menuRes.ok) throw new Error('データの取得に失敗しました');
      const [catData, menuData] = await Promise.all([catRes.json(), menuRes.json()]);
      setCategories(catData);
      setMenus(menuData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/pos/products?limit=200');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const showSuccess = (message: string) => { setSuccess(message); setTimeout(() => setSuccess(null), 3000); };
  const showError = (message: string) => { setError(message); setTimeout(() => setError(null), 5000); };

  const getAvailableColor = () => {
    const usedColors = categories.map(c => c.color.toUpperCase());
    return PRESET_COLORS.find(p => !usedColors.includes(p.color.toUpperCase()))?.color || PRESET_COLORS[0].color;
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, nameEn: category.nameEn, color: category.color, displayOrder: category.displayOrder, isActive: category.isActive });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', nameEn: '', color: getAvailableColor(), displayOrder: categories.length, isActive: true });
    }
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = editingCategory ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(categoryForm) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '保存に失敗しました'); }
      showSuccess(editingCategory ? 'カテゴリを更新しました' : 'カテゴリを追加しました');
      setIsCategoryModalOpen(false);
      fetchData();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  const openMenuModal = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu);
      setMenuForm({ name: menu.name, categoryId: menu.categoryId, price: menu.price, priceVariable: menu.priceVariable, duration: menu.duration, lastBookingTime: menu.lastBookingTime, displayOrder: menu.displayOrder, isActive: menu.isActive });
    } else {
      setEditingMenu(null);
      setMenuForm({ name: '', categoryId: categories[0]?.id || '', price: 0, priceVariable: false, duration: 60, lastBookingTime: '19:00', displayOrder: menus.length, isActive: true });
    }
    setIsMenuModalOpen(true);
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMenu ? `/api/admin/menus/${editingMenu.id}` : '/api/admin/menus';
      const method = editingMenu ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(menuForm) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '保存に失敗しました'); }
      showSuccess(editingMenu ? 'メニューを更新しました' : 'メニューを追加しました');
      setIsMenuModalOpen(false);
      fetchData();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const url = deletingItem.type === 'category' ? `/api/admin/categories/${deletingItem.id}` : `/api/admin/menus/${deletingItem.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '削除に失敗しました'); }
      showSuccess('削除しました');
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
      fetchData();
    } catch (err) { showError(err instanceof Error ? err.message : 'エラーが発生しました'); }
  };

  // Product handlers
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({ name: product.name, categoryName: product.categoryName, unitPrice: product.unitPrice, stockQuantity: product.stockQuantity, sku: product.sku || '', description: product.description || '' });
    } else {
      setEditingProduct(null);
      setProductForm(emptyProductForm());
    }
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async () => {
    if (!productForm.name || !productForm.categoryName || !productForm.unitPrice) {
      showError('商品名、カテゴリ、単価は必須です');
      return;
    }
    setIsSavingProduct(true);
    try {
      const url = editingProduct ? `/api/admin/pos/products/${editingProduct.id}` : '/api/admin/pos/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productForm, unitPrice: Number(productForm.unitPrice), stockQuantity: Number(productForm.stockQuantity) }),
      });
      if (!res.ok) { const d = await res.json(); showError(d.error || '保存に失敗しました'); return; }
      showSuccess(editingProduct ? '商品を更新しました' : '商品を追加しました');
      setIsProductModalOpen(false);
      fetchProducts();
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleProductDelete = async (id: string) => {
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

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.includes(productSearch) || p.categoryName.includes(productSearch) || (p.sku || '').includes(productSearch)
  );

  const getAddButtonLabel = () => {
    if (activeTab === 'categories') return 'カテゴリ追加';
    if (activeTab === 'products') return '商品追加';
    return 'メニュー追加';
  };

  const handleAddClick = () => {
    if (activeTab === 'categories') openCategoryModal();
    else if (activeTab === 'products') openProductModal();
    else openMenuModal();
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
              <h1 className="text-2xl font-medium">メニュー・商品管理</h1>
              <p className="text-sm text-gray-500 mt-1">施術メニュー・店販商品・カテゴリの登録・編集</p>
            </div>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {getAddButtonLabel()}
          </button>
        </div>

        {/* Alerts */}
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">{success}</div>}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm w-fit">
          {(['menus', 'products', 'categories'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {tab === 'menus' ? 'メニュー' : tab === 'products' ? '店販商品' : 'カテゴリ'}
            </button>
          ))}
        </div>

        {isLoading && activeTab !== 'products' ? (
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        ) : activeTab === 'categories' ? (
          /* Categories List */
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {categories.length === 0 ? (
              <div className="p-12 text-center text-gray-500">カテゴリがありません</div>
            ) : categories.map((cat) => (
              <div key={cat.id} className="p-4 md:p-5 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{cat.name}</p>
                    <span className="text-xs text-gray-400">{cat.nameEn}</span>
                    {!cat.isActive && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">非表示</span>}
                  </div>
                  <p className="text-xs text-gray-500">表示順: {cat.displayOrder} / メニュー数: {cat.menuCount ?? 0}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openCategoryModal(cat)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => { setDeletingItem({ type: 'category', id: cat.id, name: cat.name }); setIsDeleteModalOpen(true); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'products' ? (
          /* Products List */
          <div>
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="商品名・カテゴリ・SKUで検索..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  商品がありません
                </div>
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
                    {filteredProducts.map(product => (
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
                            <button onClick={() => openProductModal(product)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleProductDelete(product.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
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
        ) : (
          /* Menus List */
          <div className="space-y-6">
            {categories.filter(c => c.isActive || menus.some(m => m.categoryId === c.id)).map((cat) => {
              const catMenus = menus.filter(m => m.categoryId === cat.id);
              if (catMenus.length === 0) return null;
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
                    <h3 className="font-medium text-sm">{cat.name}</h3>
                    <span className="text-xs text-gray-400">({catMenus.length})</span>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                    {catMenus.map((menu) => (
                      <div key={menu.id} className="p-4 md:p-5 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{menu.name}</p>
                            {!menu.isActive && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">非表示</span>}
                            {menu.priceVariable && <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">変動</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>¥{menu.price.toLocaleString()}</span>
                            <span>{menu.duration}分</span>
                            <span>最終: {menu.lastBookingTime}</span>
                            <span>順序: {menu.displayOrder}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openMenuModal(menu)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { setDeletingItem({ type: 'menu', id: menu.id, name: menu.name }); setIsDeleteModalOpen(true); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-6">{editingCategory ? 'カテゴリ編集' : 'カテゴリ追加'}</h3>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">名前</label>
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">名前（英語）</label>
                <input type="text" value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">カラー</label>
                <div className="grid grid-cols-10 gap-2">
                  {PRESET_COLORS.map((p) => (
                    <button key={p.color} type="button" onClick={() => setCategoryForm({ ...categoryForm, color: p.color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${categoryForm.color === p.color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: p.color }} title={p.name} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">表示順</label>
                  <input type="number" value={categoryForm.displayOrder} onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })} className="w-4 h-4 text-gray-600 rounded" />
                    <span className="text-sm text-gray-600">有効</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
                  <Check className="w-4 h-4 inline mr-1" />{editingCategory ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsMenuModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-6">{editingMenu ? 'メニュー編集' : 'メニュー追加'}</h3>
            <form onSubmit={handleMenuSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">メニュー名</label>
                <input type="text" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">カテゴリ</label>
                <select value={menuForm.categoryId} onChange={(e) => setMenuForm({ ...menuForm, categoryId: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-400">
                  <option value="">選択してください</option>
                  {categories.filter(c => c.isActive).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">価格（円）</label>
                  <input type="number" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: Number(e.target.value) })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">所要時間（分）</label>
                  <input type="number" value={menuForm.duration} onChange={(e) => setMenuForm({ ...menuForm, duration: Number(e.target.value) })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">最終受付時間</label>
                  <input type="time" value={menuForm.lastBookingTime} onChange={(e) => setMenuForm({ ...menuForm, lastBookingTime: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">表示順</label>
                  <input type="number" value={menuForm.displayOrder} onChange={(e) => setMenuForm({ ...menuForm, displayOrder: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={menuForm.isActive} onChange={(e) => setMenuForm({ ...menuForm, isActive: e.target.checked })} className="w-4 h-4 text-gray-600 rounded" />
                  <span className="text-sm text-gray-600">有効</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={menuForm.priceVariable} onChange={(e) => setMenuForm({ ...menuForm, priceVariable: e.target.checked })} className="w-4 h-4 text-gray-600 rounded" />
                  <span className="text-sm text-gray-600">価格変動あり</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsMenuModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
                  <Check className="w-4 h-4 inline mr-1" />{editingMenu ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsProductModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-medium mb-6">{editingProduct ? '商品編集' : '新規商品登録'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">商品名 <span className="text-red-500">*</span></label>
                <input type="text" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">カテゴリ <span className="text-red-500">*</span></label>
                <input type="text" value={productForm.categoryName} onChange={e => setProductForm(f => ({ ...f, categoryName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                  placeholder="例: シャンプー、トリートメント" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">単価（円）<span className="text-red-500">*</span></label>
                  <input type="number" min="0" value={productForm.unitPrice} onChange={e => setProductForm(f => ({ ...f, unitPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">初期在庫</label>
                  <input type="number" min="0" value={productForm.stockQuantity} onChange={e => setProductForm(f => ({ ...f, stockQuantity: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">SKU（任意）</label>
                <input type="text" value={productForm.sku || ''} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">説明（任意）</label>
                <textarea value={productForm.description || ''} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleProductSubmit} disabled={isSavingProduct} className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {isSavingProduct ? '保存中...' : <><Check className="w-4 h-4 inline mr-1" />{editingProduct ? '更新' : '追加'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-xl font-medium">削除確認</h3>
            </div>
            <p className="text-gray-600 mb-6">「{deletingItem.name}」を削除しますか？この操作は取り消せません。</p>
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

export default function AdminMenusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">読み込み中...</div>}>
      <AdminMenusPageInner />
    </Suspense>
  );
}
