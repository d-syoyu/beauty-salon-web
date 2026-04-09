'use client';

import { useEffect, useState } from 'react';
import { Check, MessageCircle, Trash2 } from 'lucide-react';

export default function LineSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [lineBasicId, setLineBasicId] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [liffId, setLiffId] = useState('');

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
    void fetch('/api/admin/settings/line')
      .then((response) => response.json())
      .then((data) => {
        setConfigured(data.configured ?? false);
        setLineBasicId(data.lineBasicId ?? '');
        setLiffId(data.liffId ?? '');
      })
      .catch(() => flash('LINE 設定の読み込みに失敗しました。', true))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/admin/settings/line', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelAccessToken, channelSecret, liffId, lineBasicId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'LINE 設定の保存に失敗しました。');
      }

      setConfigured(true);
      flash('LINE 設定を更新しました。');
    } catch (error) {
      flash(error instanceof Error ? error.message : 'LINE 設定の保存に失敗しました。', true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('保存済みの LINE 設定を削除しますか？')) return;

    setDeleting(true);

    try {
      const response = await fetch('/api/admin/settings/line', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('LINE 設定の削除に失敗しました。');
      }

      setConfigured(false);
      setLineBasicId('');
      setChannelAccessToken('');
      setChannelSecret('');
      setLiffId('');
      flash('LINE 設定を削除しました。');
    } catch (error) {
      flash(error instanceof Error ? error.message : 'LINE 設定の削除に失敗しました。', true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <MessageCircle className="h-6 w-6 text-[#06C755]" />
            LINE
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            管理画面で利用する LINE Messaging API と LIFF の設定を保存します。
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
              <h2 className="mb-4 text-lg font-medium">設定状況</h2>
              {configured ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#06C755]/10">
                    <Check className="h-4 w-4 text-[#06C755]" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">設定済み</p>
                    {lineBasicId ? <p className="text-xs text-gray-500">LINE Basic ID: {lineBasicId}</p> : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">LINE 設定はまだ登録されていません。</p>
              )}
            </section>

            <form onSubmit={save} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="grid gap-1 text-sm">
                <label className="font-medium text-gray-700">Channel Access Token</label>
                <textarea
                  value={channelAccessToken}
                  onChange={(event) => setChannelAccessToken(event.target.value)}
                  rows={4}
                  className="rounded-xl border border-gray-200 px-4 py-3"
                />
              </div>
              <div className="grid gap-1 text-sm">
                <label className="font-medium text-gray-700">Channel Secret</label>
                <input
                  value={channelSecret}
                  onChange={(event) => setChannelSecret(event.target.value)}
                  className="rounded-xl border border-gray-200 px-4 py-3"
                />
              </div>
              <div className="grid gap-1 text-sm">
                <label className="font-medium text-gray-700">LIFF ID</label>
                <input
                  value={liffId}
                  onChange={(event) => setLiffId(event.target.value)}
                  className="rounded-xl border border-gray-200 px-4 py-3"
                />
              </div>
              <div className="grid gap-1 text-sm">
                <label className="font-medium text-gray-700">LINE Basic ID</label>
                <input
                  value={lineBasicId}
                  onChange={(event) => setLineBasicId(event.target.value)}
                  className="rounded-xl border border-gray-200 px-4 py-3"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#06C755] px-4 py-2 text-sm font-medium text-white hover:bg-[#05b44c] disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存する'}
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? '削除中...' : '削除'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
