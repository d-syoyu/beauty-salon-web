'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Loader2 } from 'lucide-react';

type SquareCard = {
  attach: (selector: string) => Promise<void>;
  destroy?: () => Promise<void> | void;
};

type CardStyleRule = {
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: string;
  borderWidth?: string;
  color?: string;
  fontSize?: string;
};

type CardOptions = {
  style?: Record<string, CardStyleRule>;
};

type SquarePayments = {
  card: (options?: CardOptions) => Promise<SquareCard>;
};

type SquareGlobal = {
  payments: (appId: string, locationId: string) => SquarePayments;
};

const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APP_ID?.trim() ?? '';
const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID?.trim() ?? '';
const squareEnvironment = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT?.trim().toLowerCase() ?? 'sandbox';
const squareScriptUrl =
  squareEnvironment === 'production'
    ? 'https://web.squarecdn.com/v1/square.js'
    : 'https://sandbox.web.squarecdn.com/v1/square.js';

const CARD_STYLE: CardOptions = {
  style: {
    '.input-container': {
      borderColor: '#E5E0DB',
      borderRadius: '0px',
    },
    '.input-container.is-focus': {
      borderColor: '#B8956E',
    },
    '.input-container.is-error': {
      borderColor: '#c72b2b',
    },
    'input': {
      backgroundColor: '#FDFCFA',
      color: '#1A1A1A',
      fontSize: '14px',
    },
    'input::placeholder': {
      color: '#B5AFA9',
    },
    '.message-text': {
      color: '#5A5550',
    },
    '.message-icon': {
      color: '#5A5550',
    },
  },
};

interface SquarePaymentProps {
  onReady?: () => void;
  onError?: (message: string) => void;
}

function FallbackPaymentForm() {
  return (
    <div className="space-y-3 sm:space-y-4 sm:mx-auto sm:max-w-[480px]">
      <div>
        <label className="mb-1.5 block text-xs text-[var(--color-warm-gray)]">カード番号</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="4111 1111 1111 1111"
          className="w-full border-2 border-[#F0EDE8] bg-[#FDFBF7] px-3 py-2.5 text-sm outline-none sm:px-4"
          readOnly
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-[var(--color-warm-gray)]">有効期限</label>
          <input
            type="text"
            placeholder="12 / 34"
            className="w-full border-2 border-[#F0EDE8] bg-[#FDFBF7] px-3 py-2.5 text-sm outline-none sm:px-4"
            readOnly
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-[var(--color-warm-gray)]">CVV</label>
          <input
            type="text"
            placeholder="123"
            className="w-full border-2 border-[#F0EDE8] bg-[#FDFBF7] px-3 py-2.5 text-sm outline-none sm:px-4"
            readOnly
          />
        </div>
      </div>
    </div>
  );
}

export default function SquarePayment({ onReady, onError }: SquarePaymentProps) {
  const containerIdRef = useRef(`square-card-container-${Math.random().toString(36).slice(2)}`);
  const cardRef = useRef<SquareCard | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [useFallback, setUseFallback] = useState(!squareAppId || !squareLocationId);

  useEffect(() => {
    if (!sdkLoaded || !squareAppId || !squareLocationId) {
      return;
    }

    let isCancelled = false;

    const mountSquareCard = async () => {
      setIsInitializing(true);

      try {
        const Square = (window as unknown as { Square?: SquareGlobal }).Square;
        if (!Square) {
          throw new Error('Square Web Payments SDK failed to load.');
        }

        const payments = Square.payments(squareAppId, squareLocationId);
        const card = await payments.card(CARD_STYLE);

        if (isCancelled) {
          await card.destroy?.();
          return;
        }

        await card.attach(`#${containerIdRef.current}`);

        if (isCancelled) {
          await card.destroy?.();
          return;
        }

        cardRef.current = card;
        setUseFallback(false);
        onReady?.();
      } catch (err) {
        setUseFallback(true);
        const message = err instanceof Error ? err.message : 'Square payment form initialization failed.';
        onError?.(message);
      } finally {
        if (!isCancelled) {
          setIsInitializing(false);
        }
      }
    };

    void mountSquareCard();

    return () => {
      isCancelled = true;
      if (cardRef.current) {
        void cardRef.current.destroy?.();
        cardRef.current = null;
      }
    };
  }, [sdkLoaded, onError, onReady]);

  return (
    <div>
      {!useFallback && (
        <Script src={squareScriptUrl} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} />
      )}

      {useFallback ? (
        <div className="px-3 py-3 sm:px-4">
          <FallbackPaymentForm />
        </div>
      ) : (
        <div className="square-payment-shell px-3 pt-4 pb-1 sm:px-4 sm:pt-5 sm:pb-1">
          <div
            id={containerIdRef.current}
            className="square-payment-container"
          />
          {isInitializing && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-gold)]" />
              <span className="ml-2 text-xs text-[var(--color-warm-gray)]">決済フォームを読み込み中...</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
