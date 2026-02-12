'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Shield, RotateCcw } from 'lucide-react';

const SESSION_KEY = 'admin_session';

export default function AdminAutoAuth({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [ready, setReady] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    const hasTabSession = sessionStorage.getItem(SESSION_KEY);

    if (status === 'authenticated' && !hasTabSession) {
      // 前のセッションが残っている → サインアウト → デモリセット → 再ログイン
      setResetting(true);
      signOut({ redirect: false }).then(async () => {
        try {
          await fetch('/api/admin/demo-reset', { method: 'POST' });
        } catch (e) {
          console.error('Demo reset failed:', e);
        }
        await signIn('guest', { redirect: false });
        sessionStorage.setItem(SESSION_KEY, '1');
        setResetting(false);
        setReady(true);
      });
      return;
    }

    if (status === 'unauthenticated') {
      // 未ログイン → デモリセット → 自動ゲストログイン
      setResetting(true);
      (async () => {
        try {
          await fetch('/api/admin/demo-reset', { method: 'POST' });
        } catch (e) {
          console.error('Demo reset failed:', e);
        }
        await signIn('guest', { redirect: false });
        sessionStorage.setItem(SESSION_KEY, '1');
        setResetting(false);
        setReady(true);
      })();
      return;
    }

    if (status === 'authenticated' && hasTabSession) {
      setReady(true);
    }
  }, [status]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {resetting ? (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 mb-4">
                <RotateCcw className="w-6 h-6 text-white animate-spin" />
              </div>
              <p className="text-sm text-gray-500">デモデータを初期化中...</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-gray-500">管理画面を準備中...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
