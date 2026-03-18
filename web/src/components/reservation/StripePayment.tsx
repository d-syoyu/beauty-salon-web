'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Lock, AlertCircle } from 'lucide-react';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const cardElementStyle = {
  base: {
    fontSize: '16px',
    color: '#2C2C2C',
    fontFamily: '"Noto Sans JP", system-ui, sans-serif',
    '::placeholder': {
      color: '#8B8680',
    },
  },
  invalid: {
    color: '#ef4444',
  },
};

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

  useEffect(() => {
    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { resolve, reject, clientSecret } = customEvent.detail;

      if (!stripe || !elements) {
        reject('決済の準備ができていません');
        return;
      }

      const cardNumber = elements.getElement(CardNumberElement);
      if (!cardNumber) {
        reject('カード情報が入力されていません');
        return;
      }

      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
        },
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

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--color-warm-gray)] mb-2">カード番号</label>
          <div className="border-2 border-[#F0EDE8] bg-[#FDFBF7] p-3 focus-within:border-[var(--color-gold)] transition-colors">
            <CardNumberElement
              onReady={() => setIsReady(true)}
              options={{ style: cardElementStyle }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--color-warm-gray)] mb-2">有効期限</label>
            <div className="border-2 border-[#F0EDE8] bg-[#FDFBF7] p-3 focus-within:border-[var(--color-gold)] transition-colors">
              <CardExpiryElement options={{ style: cardElementStyle }} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-warm-gray)] mb-2">セキュリティコード</label>
            <div className="border-2 border-[#F0EDE8] bg-[#FDFBF7] p-3 focus-within:border-[var(--color-gold)] transition-colors">
              <CardCvcElement options={{ style: cardElementStyle }} />
            </div>
          </div>
        </div>
      </div>

      {!isReady && (
        <div className="flex items-center justify-center py-4">
          <div className="inline-block w-5 h-5 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
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
            colorPrimary: '#B8956E',
            colorBackground: '#FDFBF7',
            colorText: '#2C2C2C',
            colorDanger: '#ef4444',
            fontFamily: '"Noto Sans JP", system-ui, sans-serif',
            borderRadius: '0px',
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
export function confirmStripePayment(clientSecret: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const event = new CustomEvent('stripe-confirm-payment', {
      detail: { resolve, reject, clientSecret },
    });
    window.dispatchEvent(event);
  });
}
