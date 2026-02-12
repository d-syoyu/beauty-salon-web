'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Shield } from 'lucide-react';

const SESSION_KEY = 'admin_session';

export default function AdminAutoAuth({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // タブを閉じたら sessionStorage がクリアされる
    // 再度開いた時にクッキーが残っていたらサインアウト
    if (status === 'loading') return;

    const hasTabSession = sessionStorage.getItem(SESSION_KEY);

    if (status === 'authenticated' && !hasTabSession) {
      // 前のセッションが残っている → サインアウトしてから再ログイン
      signOut({ redirect: false }).then(() => {
        signIn('guest', { redirect: false }).then(() => {
          sessionStorage.setItem(SESSION_KEY, '1');
          setReady(true);
        });
      });
      return;
    }

    if (status === 'unauthenticated') {
      // 未ログイン → 自動ゲストログイン
      signIn('guest', { redirect: false }).then(() => {
        sessionStorage.setItem(SESSION_KEY, '1');
        setReady(true);
      });
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-gray-500">管理画面を準備中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
