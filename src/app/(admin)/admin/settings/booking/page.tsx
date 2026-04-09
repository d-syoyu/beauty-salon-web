'use client';

import { useEffect, useState } from 'react';
import { Calendar, Check } from 'lucide-react';

const presetOptions = [
  { label: '当日まで', value: 0 },
  { label: '1時間前まで', value: 1 },
  { label: '3時間前まで', value: 3 },
  { label: '24時間前まで', value: 24 },
  { label: '48時間前まで', value: 48 },
  { label: '72時間前まで', value: 72 },
];

export default function BookingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellationHoursBefore, setCancellationHoursBefore] = useState(24);
  const [useCustom, setUseCustom] = useState(false);

  const flash = (value: string, isError = false) => {
    if (isError) {
      setError(value);
      setTimeout(() => setError(null), 5000);
    } else {
      setMessage(value);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  useEffect(() => {
    void fetch('/api/admin/settings')
      .then((response) => response.json())
      .then((data) => {
        const hours = data.cancellationHoursBefore ?? 24;
        setCancellationHoursBefore(hours);
        setUseCustom(!presetOptions.some((option) => option.value === hours));
      })
      .catch(() => flash('予約設定の読み込みに失敗しました。', true))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationHoursBefore }),
      });

      if (!response.ok) {
        throw new Error('予約設定の保存に失敗しました。');
      }

      flash('予約設定を更新しました。');
    } catch (error) {
      flash(error instanceof Error ? error.message : '予約設定の保存に失敗しました。', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <Calendar className="h-6 w-6" />
            予約設定
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            お客様がオンラインでキャンセルできる期限を設定します。
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-600">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-medium">キャンセル受付期限</h2>
              <p className="mb-5 text-sm text-gray-500">
                予約をキャンセルできる最短時間を選択してください。
              </p>

              <div className="space-y-3">
                {presetOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      !useCustom && cancellationHoursBefore === option.value
                        ? 'border-gray-800 bg-gray-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancellationPolicy"
                      checked={!useCustom && cancellationHoursBefore === option.value}
                      onChange={() => {
                        setUseCustom(false);
                        setCancellationHoursBefore(option.value);
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-800">{option.label}</span>
                  </label>
                ))}

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    useCustom ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationPolicy"
                    checked={useCustom}
                    onChange={() => setUseCustom(true)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="flex-1">
                    <span className="block text-sm text-gray-800">カスタム</span>
                    {useCustom ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={720}
                          value={cancellationHoursBefore}
                          onChange={(event) =>
                            setCancellationHoursBefore(
                              Math.max(0, parseInt(event.target.value, 10) || 0),
                            )
                          }
                          className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-right text-sm"
                        />
                        <span className="text-sm text-gray-600">時間前</span>
                      </div>
                    ) : null}
                  </span>
                </label>
              </div>

              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {cancellationHoursBefore === 0
                  ? '予約時刻までキャンセルを受け付けます。'
                  : `予約時刻の ${cancellationHoursBefore} 時間前までキャンセル可能です。`}
              </div>

              <div className="mt-5 border-t border-gray-100 pt-5">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {saving ? '保存中...' : '保存する'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
