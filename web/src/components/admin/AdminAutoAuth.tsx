'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Shield } from 'lucide-react';

export default function AdminAutoAuth({ children }: { children: React.ReactNode }) {
  const { status, update } = useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      setAuthError(null);
      setIsSigningIn(false);
      return;
    }

    if (status !== 'unauthenticated' || isSigningIn || authError) return;

    let cancelled = false;

    const authenticate = async () => {
      setIsSigningIn(true);
      try {
        const result = await signIn('guest', { redirect: false });
        if (cancelled) return;

        if (result?.error) {
          setAuthError('管理画面の認証に失敗しました。再試行してください。');
          return;
        }

        await update();
      } catch (error) {
        if (!cancelled) {
          console.error('Admin auto auth failed:', error);
          setAuthError('管理画面の認証に失敗しました。再試行してください。');
        }
      } finally {
        if (!cancelled) {
          setIsSigningIn(false);
        }
      }
    };

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [authError, isSigningIn, status, update]);

  const handleRetry = () => {
    setAuthError(null);
    setIsSigningIn(false);
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-sm text-gray-600 mb-4">{authError}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
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
