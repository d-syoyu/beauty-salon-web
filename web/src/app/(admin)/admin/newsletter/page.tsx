'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Send,
  Users,
  AlertTriangle,
  X,
  Eye,
} from 'lucide-react';

interface SubscriberStats {
  total: number;
}

export default function NewsletterPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [subscriberStats, setSubscriberStats] = useState<SubscriberStats | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { fetchSubscriberCount(); }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchSubscriberCount = async () => {
    try {
      const res = await fetch('/api/admin/customers?limit=1');
      if (res.ok) {
        const data = await res.json();
        // Count customers with email that haven't opted out
        // This is approximate - the actual count is done server-side when sending
        setSubscriberStats({ total: data.total || 0 });
      }
    } catch (err) {
      console.error('Failed to fetch subscriber count:', err);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setIsConfirmOpen(false);

    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();

      if (data.success) {
        setToast({
          type: 'success',
          message: `ニュースレターを${data.sentCount}件のメールアドレスに送信しました`,
        });
        setTitle('');
        setContent('');
      } else {
        setToast({
          type: 'error',
          message: `送信に失敗しました: ${data.error}`,
        });
      }
    } catch {
      setToast({
        type: 'error',
        message: '送信中にエラーが発生しました',
      });
    } finally {
      setIsSending(false);
    }
  };

  const previewHtml = `
    <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; background: #FDFCFA; padding: 40px 30px;">
      <h1 style="color: #1A1A1A; font-size: 24px; text-align: center; letter-spacing: 0.1em;">LUMINA HAIR STUDIO</h1>
      <div style="width: 40px; height: 1px; background: #B8956E; margin: 20px auto;"></div>
      <h2 style="color: #1A1A1A; font-size: 20px;">${title}</h2>
      <div style="color: #5A5550; line-height: 1.8; white-space: pre-wrap;">${content}</div>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E0DB;">
        <p style="color: #A89686; font-size: 12px;">LUMINA HAIR STUDIO<br/>東京都渋谷区神宮前1-2-3</p>
      </div>
    </div>
  `;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-medium flex items-center gap-2">
                <Mail className="w-6 h-6" /> ニュースレター
              </h1>
              <p className="text-sm text-gray-500 mt-1">顧客へのメール配信</p>
            </div>
          </div>
          {subscriberStats && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">登録顧客: 約{subscriberStats.total}名</span>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-4 rounded-lg text-sm flex items-center justify-between ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-white/50 rounded"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compose */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">メール作成</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">件名</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="お知らせのタイトル"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">本文</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="メール本文を入力してください..."
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 resize-y"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPreview(!isPreview)}
                  className="flex items-center gap-2 px-4 py-2.5 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  {isPreview ? '編集に戻る' : 'プレビュー'}
                </button>
                <button
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={!title || !content || isSending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? '送信中...' : '送信する'}
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">プレビュー</h2>
            {!title && !content ? (
              <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                左側でタイトルと本文を入力するとプレビューが表示されます
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 text-xs text-gray-500">
                  件名: 【LUMINA HAIR STUDIO】{title}
                </div>
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Send Dialog */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsConfirmOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-medium">送信確認</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                以下のニュースレターをメール配信対象の全顧客に送信しますか？
              </p>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{title}</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-3">{content}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSend}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="w-4 h-4 inline mr-1" />
                送信する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
