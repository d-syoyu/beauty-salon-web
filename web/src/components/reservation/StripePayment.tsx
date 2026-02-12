'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Lock, AlertCircle } from 'lucide-react';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface StripePaymentFormProps {
  onReady: () => void;
  onError: (message: string) => void;
}

function StripePaymentForm({ onReady, onError }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (stripe && elements) {
      onReady();
    }
  }, [stripe, elements, onReady]);

  // Expose stripe/elements via a custom event so the parent can trigger confirmation
  useEffect(() => {
    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { resolve, reject } = customEvent.detail;

      if (!stripe || !elements) {
        reject('決済の準備ができていません');
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/reservation/complete',
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || '決済に失敗しました');
        reject(error.message || '決済に失敗しました');
      } else {
        resolve();
      }
    };

    window.addEventListener('stripe-confirm-payment', handler);
    return () => window.removeEventListener('stripe-confirm-payment', handler);
  }, [stripe, elements, onError]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-3.5 h-3.5 text-[var(--color-warm-gray)]" />
        <span className="text-xs text-[var(--color-warm-gray)]">
          安全な決済（SSL暗号化通信）
        </span>
      </div>
      <PaymentElement
        onReady={() => setIsReady(true)}
        options={{
          layout: 'tabs',
        }}
      />
      {!isReady && (
        <div className="flex items-center justify-center py-4">
          <div className="inline-block w-5 h-5 border-2 border-[var(--color-sage)] border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-[var(--color-warm-gray)]">決済フォームを読み込み中...</span>
        </div>
      )}
    </div>
  );
}

interface StripePaymentProps {
  clientSecret: string;
  onReady: () => void;
  onError: (message: string) => void;
}

export default function StripePayment({ clientSecret, onReady, onError }: StripePaymentProps) {
  if (!clientSecret) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>決済の初期化に失敗しました。ページを再読み込みしてください。</span>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#6B8E6B',
            colorBackground: '#FDFBF7',
            colorText: '#2C2C2C',
            colorDanger: '#ef4444',
            fontFamily: '"Noto Sans JP", system-ui, sans-serif',
            borderRadius: '0px',
          },
          rules: {
            '.Input': {
              border: '2px solid #F0EDE8',
              boxShadow: 'none',
              padding: '12px 16px',
            },
            '.Input:focus': {
              border: '2px solid #6B8E6B',
              boxShadow: 'none',
            },
            '.Label': {
              fontSize: '12px',
              color: '#8B8680',
            },
          },
        },
        locale: 'ja',
      }}
    >
      <StripePaymentForm onReady={onReady} onError={onError} />
    </Elements>
  );
}

// Helper to trigger payment confirmation from outside the Elements context
export function confirmStripePayment(): Promise<void> {
  return new Promise((resolve, reject) => {
    const event = new CustomEvent('stripe-confirm-payment', {
      detail: { resolve, reject },
    });
    window.dispatchEvent(event);
  });
}
