'use client';

import Link from 'next/link';
import { Calendar, Lock, MapPin, MessageCircle } from 'lucide-react';

const settingsItems = [
  {
    label: '予約設定',
    description: 'キャンセル受付時間など、予約に関する設定を管理します。',
    href: '/admin/settings/booking',
    icon: <Calendar className="h-5 w-5 text-gray-600" />,
  },
  {
    label: 'LINE',
    description: 'Messaging API のトークン、シークレット、LIFF を設定します。',
    href: '/admin/settings/line',
    icon: <MessageCircle className="h-5 w-5 text-[#06C755]" />,
  },
  {
    label: 'Google Business',
    description: '選択中の店舗に紐づく Google Business 店舗 ID を保存します。',
    href: '/admin/settings/google-business',
    icon: <MapPin className="h-5 w-5 text-blue-600" />,
  },
  {
    label: 'パスワード',
    description: '現在ログイン中の管理者パスワードを変更します。',
    href: '/admin/settings/password',
    icon: <Lock className="h-5 w-5 text-gray-600" />,
  },
];

export default function SettingsIndexPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-medium">設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            予約、メッセージ配信、店舗連携、アカウント情報を管理します。
          </p>
        </div>
        <div className="space-y-3">
          {settingsItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm transition-colors hover:bg-gray-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
