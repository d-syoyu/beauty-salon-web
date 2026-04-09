'use client';

import { useEffect, useState } from 'react';
import { MapPin, Save } from 'lucide-react';
import { getSelectedShopIdFromCookie, subscribeAdminShopChanged } from '@/lib/admin-shop-client';

type Shop = {
  id: string;
  name: string;
  googleBusinessLocationId: string | null;
};

export default function GoogleBusinessSettingsPage() {
  const [selectedShopId, setSelectedShopId] = useState<string | null>(getSelectedShopIdFromCookie);
  const [shops, setShops] = useState<Shop[]>([]);
  const [locationId, setLocationId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? null;

  useEffect(() => {
    void fetch('/api/admin/shops')
      .then((response) => response.json())
      .then((data) => {
        setShops(data);
        const currentSelected = data.find((shop: Shop) => shop.id === selectedShopId) ?? data[0] ?? null;
        setLocationId(currentSelected?.googleBusinessLocationId ?? '');
      })
      .catch(() => setError('店舗情報の読み込みに失敗しました。'));
  }, [selectedShopId]);

  useEffect(() => {
    return subscribeAdminShopChanged(({ shopId }) => {
      setSelectedShopId(shopId);
    });
  }, []);

  const save = async () => {
    if (!selectedShop) {
      setError('先にサイドバーで店舗を選択してください。');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/shops/${selectedShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleBusinessLocationId: locationId || null }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Google Business 店舗 ID の保存に失敗しました。');
      }

      setShops((current) =>
        current.map((shop) =>
          shop.id === selectedShop.id
            ? { ...shop, googleBusinessLocationId: locationId || null }
            : shop,
        ),
      );
      setMessage('Google Business 店舗 ID を更新しました。');
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google Business 店舗 ID の保存に失敗しました。');
      setMessage(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <MapPin className="h-6 w-6 text-blue-600" />
            Google Business
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            選択中の店舗に紐づく Google Business 店舗 ID を保存します。
          </p>
        </div>

        {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div> : null}
        {message ? <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-600">{message}</div> : null}

        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          {!selectedShop ? (
            <p className="text-sm text-gray-600">先にサイドバーで店舗を選択してください。</p>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedShop.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  現在の ID: {selectedShop.googleBusinessLocationId ?? '未設定'}
                </p>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-gray-700">Google Business 店舗 ID</span>
                <input
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  className="rounded-xl border border-gray-200 px-4 py-3"
                  placeholder="locations/xxxxxxxx"
                />
              </label>

              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? '保存中...' : '保存する'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
