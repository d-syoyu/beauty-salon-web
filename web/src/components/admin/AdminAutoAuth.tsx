'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Shield } from 'lucide-react';

export default function AdminAutoAuth({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      signIn('guest', { redirect: false }).then(() => {
        setReady(true);
      });
      return;
    }

    if (status === 'authenticated') {
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
