'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type CampaignSend = {
  id: string;
  channel: string;
  sentAt: string | Date;
  recipientCount: number;
  successCount: number;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  channels: string[];
  status: string;
  publishedAt: string | Date | null;
  expiresAt: string | Date | null;
  shopId: string | null;
  shop: { id: string; name: string } | null;
  sends: CampaignSend[];
};

const channelOptions = [
  { value: 'web', label: 'Web掲載' },
  { value: 'email', label: 'メール' },
  { value: 'line', label: 'LINE' },
];

function createEmptyForm() {
  return {
    title: '',
    body: '',
    imageUrl: '',
    channels: ['web'] as string[],
  };
}

export function CampaignsClient({
  initialAnnouncements,
  selectedShopId,
  shopName,
}: {
  initialAnnouncements: Announcement[];
  selectedShopId: string | null;
  shopName: string | null;
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [selectedId, setSelectedId] = useState<string | null>(initialAnnouncements[0]?.id ?? null);
  const [form, setForm] = useState(createEmptyForm());
  const [saving, setSaving] = useState(false);

  const selected = announcements.find((item) => item.id === selectedId) ?? null;

  const openCreate = () => {
    setSelectedId(null);
    setForm(createEmptyForm());
  };

  const openExisting = (announcement: Announcement) => {
    setSelectedId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      imageUrl: announcement.imageUrl ?? '',
      channels: announcement.channels,
    });
  };

  const toggleChannel = (value: string) => {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(value)
        ? current.channels.filter((item) => item !== value)
        : [...current.channels, value],
    }));
  };

  const refreshSelected = (announcement: Announcement) => {
    setAnnouncements((current) => {
      const exists = current.some((item) => item.id === announcement.id);
      return exists
        ? current.map((item) => (item.id === announcement.id ? announcement : item))
        : [announcement, ...current];
    });
    setSelectedId(announcement.id);
  };

  const saveDraft = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('タイトルと本文は必須です。');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        selected ? `/api/admin/campaigns/${selected.id}` : '/api/admin/campaigns',
        {
          method: selected ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            body: form.body,
            imageUrl: form.imageUrl || null,
            channels: form.channels,
            shopId: selectedShopId,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'キャンペーンの保存に失敗しました。');

      refreshSelected(data.announcement);
      toast.success(selected ? 'キャンペーンを更新しました。' : 'キャンペーンを作成しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'キャンペーンの保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveDraft();
      const response = await fetch(`/api/admin/campaigns/${selected.id}/publish`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'キャンペーンの公開に失敗しました。');
      refreshSelected(data.announcement);
      toast.success('キャンペーンを公開しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'キャンペーンの公開に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!selected) return;
    const sendChannels = form.channels.filter((channel) => channel !== 'web');
    if (sendChannels.length === 0) {
      toast.error('配信先としてメールまたは LINE を選択してください。');
      return;
    }
    if (!window.confirm('選択した配信先で送信履歴を作成しますか？')) return;

    setSaving(true);
    try {
      await saveDraft();
      const response = await fetch(`/api/admin/campaigns/${selected.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: sendChannels }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'キャンペーンの送信に失敗しました。');

      const refreshed = await fetch('/api/admin/campaigns');
      const refreshedData = await refreshed.json();
      setAnnouncements(refreshedData.announcements);
      setSelectedId(selected.id);
      toast.success('送信履歴を作成しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'キャンペーンの送信に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm(`「${selected.title}」を削除しますか？`)) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/campaigns/${selected.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'キャンペーンの削除に失敗しました。');

      setAnnouncements((current) => current.filter((item) => item.id !== selected.id));
      setSelectedId(null);
      setForm(createEmptyForm());
      toast.success('キャンペーンを削除しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'キャンペーンの削除に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">キャンペーン</h1>
          <p className="mt-1 text-sm text-slate-500">
            {shopName ? `${shopName} のキャンペーン管理` : '全店舗のキャンペーンを管理します。'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          新規キャンペーン
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            {announcements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                キャンペーンはまだありません。
              </div>
            ) : (
              announcements.map((announcement) => (
                <button
                  key={announcement.id}
                  type="button"
                  onClick={() => openExisting(announcement)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    selectedId === announcement.id
                      ? 'border-blue-300 bg-blue-50/40'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{announcement.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{announcement.status}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                      {announcement.channels.join(', ') || '未設定'}
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
              {selected ? 'キャンペーンを編集' : 'キャンペーンを作成'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              下書き保存、Web 公開、メールや LINE の配信履歴作成ができます。
            </p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">タイトル</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">本文</span>
              <textarea rows={8} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">画像 URL</span>
              <input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>

            <div className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">配信先</span>
              <div className="flex flex-wrap gap-2">
                {channelOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${
                      form.channels.includes(option.value)
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.channels.includes(option.value)}
                      onChange={() => toggleChannel(option.value)}
                      className="hidden"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {selected ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p>状態: <span className="font-medium text-slate-900">{selected.status}</span></p>
                <p className="mt-1">対象店舗: <span className="font-medium text-slate-900">{selected.shop?.name ?? '全店舗'}</span></p>
                <p className="mt-1">公開日時: {selected.publishedAt ? new Date(selected.publishedAt).toLocaleString() : '未公開'}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button onClick={saveDraft} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                {saving ? '保存中...' : selected ? '下書きを更新' : '下書きを作成'}
              </button>
              {selected ? (
                <>
                  <button onClick={publish} disabled={saving} className="rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                    Web に公開
                  </button>
                  <button onClick={send} disabled={saving} className="rounded-xl border border-emerald-200 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                    配信履歴を作成
                  </button>
                  <button onClick={remove} disabled={saving} className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">
                    削除
                  </button>
                </>
              ) : null}
            </div>

            {selected?.sends.length ? (
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">送信履歴</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {selected.sends.map((send) => (
                    <div key={send.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>{send.channel}</span>
                      <span className="text-slate-500">
                        {new Date(send.sentAt).toLocaleString()} · {send.successCount}/{send.recipientCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
