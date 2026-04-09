'use client';

import { useActionState } from 'react';
import { Check } from 'lucide-react';
import { changePasswordAction } from './actions';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200';

export default function ChangePasswordPage() {
  const [state, action, isPending] = useActionState(changePasswordAction, {
    success: false,
    error: null,
  });

  return (
    <div className="mx-auto max-w-md px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">パスワード変更</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          現在ログイン中の管理者アカウントのパスワードを更新します。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {state.success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-900">パスワードを更新しました。</p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            {state.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="current">
                現在のパスワード
              </label>
              <input id="current" name="current" type="password" required autoComplete="current-password" className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                新しいパスワード
              </label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="confirm">
                新しいパスワード確認
              </label>
              <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </div>

            <button type="submit" disabled={isPending} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
              {isPending ? '更新中...' : 'パスワードを更新'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
