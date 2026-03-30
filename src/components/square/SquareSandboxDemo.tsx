'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { AlertCircle, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';

type SquareCardTokenizeResult = {
  status: string;
  token?: string;
  details?: {
    card?: {
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
    };
  };
  errors?: Array<{
    code?: string;
    message?: string;
    detail?: string;
  }>;
};

type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<SquareCardTokenizeResult>;
  destroy?: () => Promise<void> | void;
};

type SquarePayments = {
  card: () => Promise<SquareCard>;
};

type SquareGlobal = {
  payments: (appId: string, locationId: string) => SquarePayments;
};

declare global {
  interface Window {
    Square?: SquareGlobal;
  }
}

const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID?.trim() ?? '';
const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID?.trim() ?? '';

export default function SquareSandboxDemo() {
  const cardRef = useRef<SquareCard | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenResult, setTokenResult] = useState<SquareCardTokenizeResult | null>(null);

  useEffect(() => {
    if (!sdkLoaded || !appId || !locationId) {
      return;
    }

    let cancelled = false;

    const initializeCard = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        if (!window.Square) {
          throw new Error('Square SDK の読み込みに失敗しました。');
        }

        const payments = window.Square.payments(appId, locationId);
        const card = await payments.card();

        if (cancelled) {
          await card.destroy?.();
          return;
        }

        await card.attach('#square-card-container');

        if (cancelled) {
          await card.destroy?.();
          return;
        }

        cardRef.current = card;
        setIsReady(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Square フォームの初期化に失敗しました。';
        setError(message);
        setIsReady(false);
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };

    void initializeCard();

    return () => {
      cancelled = true;
      setIsReady(false);
      if (cardRef.current) {
        void cardRef.current.destroy?.();
        cardRef.current = null;
      }
    };
  }, [sdkLoaded]);

  const handleTokenize = async () => {
    if (!cardRef.current) {
      setError('カードフォームの準備がまだ完了していません。');
      return;
    }

    setIsTokenizing(true);
    setError(null);
    setTokenResult(null);

    try {
      const result = await cardRef.current.tokenize();

      if (result.status !== 'OK') {
        const message =
          result.errors?.map((entry) => entry.message || entry.detail).filter(Boolean).join(' / ') ||
          'トークン化に失敗しました。';
        setError(message);
        return;
      }

      setTokenResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'トークン化に失敗しました。';
      setError(message);
    } finally {
      setIsTokenizing(false);
    }
  };

  const isConfigured = Boolean(appId && locationId);

  return (
    <section className="bg-white p-6 md:p-10 border border-[var(--color-light-gray)]">
      <Script
        src="https://sandbox.web.squarecdn.com/v1/square.js"
        strategy="afterInteractive"
        onLoad={() => setSdkLoaded(true)}
      />

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-3 py-1 text-xs tracking-[0.2em] text-[var(--color-charcoal)]">
          <CreditCard className="h-3.5 w-3.5" />
          SQUARE SANDBOX
        </div>
        <h1 className="mt-4 text-3xl font-[family-name:var(--font-serif)] text-[var(--color-charcoal)]">
          Square テスト決済フォーム
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--color-warm-gray)]">
          このページはサンプルです。実際の決済APIは呼ばず、Square のカードフォーム表示と
          `tokenize()` の動作確認だけを行います。
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Square の公開環境変数が未設定です。</p>
              <p className="mt-1">
                `web/.env.local` に `NEXT_PUBLIC_SQUARE_APP_ID` と
                `NEXT_PUBLIC_SQUARE_LOCATION_ID` を追加してください。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-light-gray)] bg-[var(--color-cream)] p-5">
            <p className="mb-3 text-sm font-medium text-[var(--color-charcoal)]">カード入力欄</p>
            <div
              id="square-card-container"
              className="min-h-24 rounded-xl border border-[var(--color-light-gray)] bg-white px-4 py-3"
            />
            {isInitializing && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-warm-gray)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Square フォームを読み込み中です。
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleTokenize}
            disabled={!isConfigured || !isReady || isTokenizing}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm tracking-wider transition-all ${
              !isConfigured || !isReady || isTokenizing
                ? 'cursor-not-allowed bg-gray-300 text-white'
                : 'rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-white hover:shadow-[0_0_20px_rgba(184,149,110,0.3)] hover:-translate-y-0.5'
            }`}
          >
            {isTokenizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            テストトークンを発行
          </button>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {tokenResult?.token && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                トークン化に成功しました
              </div>
              <p className="mt-2 break-all font-mono text-xs leading-6">{tokenResult.token}</p>
              {tokenResult.details?.card && (
                <p className="mt-2 text-xs text-emerald-800">
                  {tokenResult.details.card.brand ?? 'CARD'} / 下4桁 {tokenResult.details.card.last4 ?? '----'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-light-gray)] bg-[var(--color-cream)] p-5">
            <p className="text-sm font-medium text-[var(--color-charcoal)]">Sandbox テスト用入力例</p>
            <div className="mt-4 space-y-3 text-sm text-[var(--color-warm-gray)]">
              <p>カード番号: `4111 1111 1111 1111`</p>
              <p>有効期限: 未来日付なら任意</p>
              <p>CVV: `111`</p>
              <p>郵便番号: 任意の5桁</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-light-gray)] bg-[var(--color-cream)] p-5 text-sm leading-7 text-[var(--color-warm-gray)]">
            <p className="font-medium text-[var(--color-charcoal)]">メモ</p>
            <p className="mt-3">
              この実装ではバックエンドに nonce を送っていないため、課金やオーソリは発生しません。
            </p>
            <p className="mt-2">
              本番化するときは、このトークンをサーバーへ送って Square Payments API で決済作成に切り替えます。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
