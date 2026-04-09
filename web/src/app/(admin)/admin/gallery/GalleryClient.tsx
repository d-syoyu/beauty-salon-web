'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type GalleryPhoto = {
  id: string;
  imageUrl: string;
  caption: string | null;
  displayOrder: number;
  isPublished: boolean;
};

const emptyForm = {
  imageUrl: '',
  caption: '',
  displayOrder: 0,
  isPublished: false,
};

export function GalleryClient({
  initialPhotos,
  selectedShopId,
  shopName,
}: {
  initialPhotos: GalleryPhoto[];
  selectedShopId: string | null;
  shopName: string | null;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setSelected(null);
    setIsNew(true);
    setForm(emptyForm);
  };

  const openEdit = (photo: GalleryPhoto) => {
    setSelected(photo);
    setIsNew(false);
    setForm({
      imageUrl: photo.imageUrl,
      caption: photo.caption ?? '',
      displayOrder: photo.displayOrder,
      isPublished: photo.isPublished,
    });
  };

  const closeEditor = () => {
    setSelected(null);
    setIsNew(false);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.imageUrl.trim()) {
      toast.error('画像 URL は必須です。');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        selected ? `/api/admin/gallery/${selected.id}` : '/api/admin/gallery',
        {
          method: selected ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            shopId: selectedShopId,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '写真の保存に失敗しました。');

      if (selected) {
        setPhotos((current) => current.map((item) => (item.id === data.id ? data : item)));
        setSelected(data);
      } else {
        setPhotos((current) => [data, ...current]);
        setSelected(data);
        setIsNew(false);
      }

      toast.success(selected ? '写真を更新しました。' : '写真を作成しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '写真の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm('このギャラリー写真を削除しますか？')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/gallery/${selected.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || '写真の削除に失敗しました。');

      setPhotos((current) => current.filter((item) => item.id !== selected.id));
      closeEditor();
      toast.success('写真を削除しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '写真の削除に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ギャラリー</h1>
          <p className="mt-1 text-sm text-slate-500">
            {shopName ? `${shopName} のギャラリー` : '全店舗のギャラリーを管理します。'}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          写真を追加
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {photos.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              ギャラリー写真はまだありません。
            </div>
          ) : (
            photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openEdit(photo)}
                className={`overflow-hidden rounded-3xl border text-left shadow-sm transition ${
                  selected?.id === photo.id ? 'border-blue-300' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.imageUrl} alt={photo.caption ?? ''} className="aspect-square w-full object-cover" />
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {photo.caption || 'タイトル未設定'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(photo.isPublished ? '公開中' : '非公開') + ' ・ 表示順 ' + photo.displayOrder}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">
              {selected ? '写真を編集' : isNew ? '写真を追加' : '写真詳細'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              写真 URL、キャプション、表示順、公開状態を設定します。
            </p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">画像 URL</span>
              <input
                value={form.imageUrl}
                onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">キャプション</span>
              <input
                value={form.caption}
                onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">表示順</span>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
              />
              サイトで公開する
            </label>

            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : selected ? '写真を更新' : '写真を作成'}
              </button>
              {selected ? (
                <button
                  onClick={remove}
                  disabled={saving}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  削除
                </button>
              ) : null}
              <button
                onClick={closeEditor}
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
