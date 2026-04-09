'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type BusinessHour = {
  id?: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  lastBookingOffsetMin: number;
};

type Shop = {
  id: string;
  name: string;
  publicSlug: string | null;
  address: string | null;
  phoneNumber: string | null;
  description: string | null;
  accessInfo: string | null;
  coverImageUrl: string | null;
  googleBusinessLocationId: string | null;
  isActive: boolean;
  isPublished: boolean;
  businessHours: BusinessHour[];
};

type ShopForm = {
  name: string;
  publicSlug: string;
  address: string;
  phoneNumber: string;
  description: string;
  accessInfo: string;
  coverImageUrl: string;
  googleBusinessLocationId: string;
  isActive: boolean;
  isPublished: boolean;
  businessHours: BusinessHour[];
};

const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

const defaultBusinessHours: BusinessHour[] = [
  { dayOfWeek: 0, isOpen: true, openTime: '09:00', closeTime: '18:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 1, isOpen: false, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 2, isOpen: true, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 3, isOpen: true, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 4, isOpen: true, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 5, isOpen: true, openTime: '10:00', closeTime: '19:00', lastBookingOffsetMin: 60 },
  { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '18:00', lastBookingOffsetMin: 60 },
];

function createEmptyForm(): ShopForm {
  return {
    name: '',
    publicSlug: '',
    address: '',
    phoneNumber: '',
    description: '',
    accessInfo: '',
    coverImageUrl: '',
    googleBusinessLocationId: '',
    isActive: true,
    isPublished: true,
    businessHours: defaultBusinessHours.map((item) => ({ ...item })),
  };
}

function buildForm(shop: Shop): ShopForm {
  return {
    name: shop.name,
    publicSlug: shop.publicSlug ?? '',
    address: shop.address ?? '',
    phoneNumber: shop.phoneNumber ?? '',
    description: shop.description ?? '',
    accessInfo: shop.accessInfo ?? '',
    coverImageUrl: shop.coverImageUrl ?? '',
    googleBusinessLocationId: shop.googleBusinessLocationId ?? '',
    isActive: shop.isActive,
    isPublished: shop.isPublished,
    businessHours:
      shop.businessHours.length > 0
        ? shop.businessHours.map((item) => ({ ...item }))
        : defaultBusinessHours.map((item) => ({ ...item })),
  };
}

export default function ShopsClient({ initialShops }: { initialShops: Shop[] }) {
  const [shops, setShops] = useState(initialShops);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShopForm>(createEmptyForm());
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(createEmptyForm());
  };

  const openEdit = (shop: Shop) => {
    setEditingId(shop.id);
    setForm(buildForm(shop));
  };

  const closeEditor = () => {
    setEditingId(null);
    setForm(createEmptyForm());
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('店舗名は必須です。');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/admin/shops/${editingId}` : '/api/admin/shops',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || '店舗の保存に失敗しました。');
      }

      const savedShop = data as Shop;
      setShops((current) =>
        editingId
          ? current.map((item) => (item.id === savedShop.id ? savedShop : item))
          : [...current, savedShop],
      );
      toast.success(editingId ? '店舗情報を更新しました。' : '店舗を作成しました。');
      closeEditor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '店舗の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">店舗</h1>
          <p className="mt-1 text-sm text-slate-500">
            店舗情報、公開状態、営業時間、Google Business の連携先を管理します。
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          新規店舗
        </button>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className={`rounded-3xl border p-5 shadow-sm transition-colors ${
                editingId === shop.id ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{shop.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">/{shop.publicSlug ?? 'スラッグ未設定'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => (editingId === shop.id ? closeEditor() : openEdit(shop))}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    editingId === shop.id
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {editingId === shop.id ? '閉じる' : '編集'}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={`whitespace-nowrap rounded-full px-3 py-1.5 ${shop.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {shop.isActive ? '有効' : '無効'}
                </span>
                <span className={`whitespace-nowrap rounded-full px-3 py-1.5 ${shop.isPublished ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {shop.isPublished ? '公開中' : '非公開'}
                </span>
              </div>

              {shop.address ? <p className="mt-4 text-sm text-slate-600">{shop.address}</p> : null}
              {shop.phoneNumber ? <p className="mt-1 text-sm text-slate-600">{shop.phoneNumber}</p> : null}

              <div className="mt-4 grid gap-2 text-sm text-slate-500">
                {shop.businessHours.map((hour) => (
                  <div key={`${shop.id}-${hour.dayOfWeek}`} className="flex items-center justify-between">
                    <span>{dayLabels[hour.dayOfWeek]}</span>
                    <span>{hour.isOpen ? `${hour.openTime} - ${hour.closeTime}` : '休業'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">
              {editingId ? '店舗を編集' : '店舗を作成'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              公開用スラッグ、紹介文、営業時間、Google Business の店舗 ID を設定します。
            </p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">店舗名</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">公開用スラッグ</span>
              <input value={form.publicSlug} onChange={(event) => setForm({ ...form, publicSlug: event.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">住所</span>
                <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">電話番号</span>
                <input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">説明文</span>
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">アクセス情報</span>
              <textarea rows={4} value={form.accessInfo} onChange={(event) => setForm({ ...form, accessInfo: event.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">カバー画像 URL</span>
                <input value={form.coverImageUrl} onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Google Business 店舗 ID</span>
                <input value={form.googleBusinessLocationId} onChange={(event) => setForm({ ...form, googleBusinessLocationId: event.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                店舗を有効にする
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />
                サイトに表示する
              </label>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">営業時間</h3>
              <div className="mt-4 space-y-3">
                {form.businessHours.map((hour, index) => (
                  <div key={hour.dayOfWeek} className="grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-[90px_110px_1fr_1fr_120px]">
                    <div className="flex items-center font-medium text-slate-900">{dayLabels[hour.dayOfWeek]}</div>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={hour.isOpen}
                        onChange={(event) => {
                          const next = [...form.businessHours];
                          next[index] = { ...hour, isOpen: event.target.checked };
                          setForm({ ...form, businessHours: next });
                        }}
                      />
                      営業
                    </label>
                    <input type="time" value={hour.openTime} disabled={!hour.isOpen} onChange={(event) => {
                      const next = [...form.businessHours];
                      next[index] = { ...hour, openTime: event.target.value };
                      setForm({ ...form, businessHours: next });
                    }} className="rounded-2xl border border-slate-200 px-3 py-2 disabled:bg-slate-100" />
                    <input type="time" value={hour.closeTime} disabled={!hour.isOpen} onChange={(event) => {
                      const next = [...form.businessHours];
                      next[index] = { ...hour, closeTime: event.target.value };
                      setForm({ ...form, businessHours: next });
                    }} className="rounded-2xl border border-slate-200 px-3 py-2 disabled:bg-slate-100" />
                    <input type="number" min={0} step={10} value={hour.lastBookingOffsetMin} disabled={!hour.isOpen} onChange={(event) => {
                      const next = [...form.businessHours];
                      next[index] = { ...hour, lastBookingOffsetMin: Number(event.target.value) };
                      setForm({ ...form, businessHours: next });
                    }} className="rounded-2xl border border-slate-200 px-3 py-2 disabled:bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={submit} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                {saving ? '保存中...' : editingId ? '店舗を更新' : '店舗を作成'}
              </button>
              <button onClick={closeEditor} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                クリア
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
