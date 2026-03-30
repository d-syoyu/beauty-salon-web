'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Calendar, Clock, Scissors, ArrowRight, Phone, CreditCard, Store } from 'lucide-react';
import { CATEGORY_COLORS } from '@/constants/menu';

interface ReservationDetail {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: string;
  menuSummary: string;
  totalPrice: number;
  totalDuration: number;
  couponDiscount?: number;
  paymentMethod?: string;
  note?: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  items: Array<{
    id: string;
    menuName: string;
    category: string;
    price: number;
    duration: number;
  }>;
  coupon?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
  } | null;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function ReservationCompleteContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('id');

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId) {
      setError('予約IDが見つかりません');
      setIsLoading(false);
      return;
    }

    const fetchReservation = async () => {
      try {
        const res = await fetch(`/api/reservations/${reservationId}`);
        if (!res.ok) {
          throw new Error('予約情報の取得に失敗しました');
        }
        const data = await res.json();
        setReservation(data.reservation);
      } catch (err) {
        console.error('Failed to fetch reservation:', err);
        setError('予約情報の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[var(--color-sage)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[var(--color-warm-gray)]">予約情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] pt-32">
        <div className="container-narrow text-center py-20">
          <p className="text-[var(--color-warm-gray)] mb-8">
            {error || '予約情報が見つかりませんでした'}
          </p>
          <Link href="/reservation" className="btn-primary">
            予約ページに戻る
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const date = parseDate(reservation.date);
  const couponDiscount = reservation.couponDiscount || 0;
  const finalPrice = reservation.totalPrice - couponDiscount;
  const totalDuration = reservation.totalDuration;

  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-32">
      {/* Hero */}
      <section className="container-wide pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <p className="text-subheading mb-4">Reservation Complete</p>
          <h1 className="text-display mb-6">ご予約完了</h1>
          <div className="divider-line mx-auto mb-8" />
        </motion.div>
      </section>

      <div className="container-narrow pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white p-6 md:p-10 max-w-2xl mx-auto"
        >
          {/* Success Icon */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4, type: 'spring' }}
              className="w-20 h-20 rounded-full bg-[var(--color-sage)] flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-[family-name:var(--font-serif)] mb-4">
              ご予約ありがとうございます
            </h2>
            <p className="text-[var(--color-warm-gray)] mb-2">
              ご予約内容を確認後、<br />
              確認のお電話またはメールをお送りいたします。
            </p>
            <p className="text-sm text-[var(--color-warm-gray)]">
              ※24時間以内にご連絡がない場合は、お手数ですがお電話ください。
            </p>
          </div>

          {/* Divider */}
          <div className="w-8 h-[1px] bg-[var(--color-gold)] mx-auto mb-8" />

          {/* Reservation Details */}
          <div className="space-y-6">
            {/* Menus */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="w-4 h-4 text-[var(--color-sage)]" />
                <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
                  Menu
                </span>
              </div>
              <div className="space-y-2">
                {reservation.items.map((item) => {
                  const color = CATEGORY_COLORS[item.category] || '#6B8E6B';
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-[var(--color-cream)]"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm truncate">{item.menuName}</span>
                      </div>
                      <span className="text-sm text-[var(--color-gold)] flex-shrink-0">
                        ¥{item.price.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-[var(--color-sage)]" />
                <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
                  Date & Time
                </span>
              </div>
              <p className="text-sm">
                {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日
                （{WEEKDAYS[date.getDay()]}）
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3.5 h-3.5 text-[var(--color-warm-gray)]" />
                <span className="text-sm">
                  {reservation.startTime}
                  {reservation.endTime && ` 〜 ${reservation.endTime}`}
                </span>
                <span className="text-xs text-[var(--color-warm-gray)]">
                  （約{totalDuration}分）
                </span>
              </div>
            </div>

            {/* Customer */}
            <div>
              <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)] block mb-2">
                Customer
              </span>
              <p className="text-sm">{reservation.user.name || '名前未登録'}</p>
              {reservation.user.phone && (
                <p className="text-sm text-[var(--color-warm-gray)]">{reservation.user.phone}</p>
              )}
              {reservation.user.email && (
                <p className="text-sm text-[var(--color-warm-gray)]">{reservation.user.email}</p>
              )}
            </div>

            {/* Note */}
            {reservation.note && (
              <div>
                <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)] block mb-2">
                  Note
                </span>
                <p className="text-sm text-[var(--color-warm-gray)] whitespace-pre-wrap">
                  {reservation.note}
                </p>
              </div>
            )}

            {/* Payment Method */}
            {reservation.paymentMethod && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-[var(--color-sage)]" />
                  <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
                    Payment
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {reservation.paymentMethod === 'ONLINE' ? (
                    <>
                      <CreditCard className="w-4 h-4 text-[var(--color-warm-gray)]" />
                      <span>クレジットカード決済</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-4 h-4 text-[var(--color-warm-gray)]" />
                      <span>現金払い（ご来店時）</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t border-[var(--color-light-gray)] pt-4 space-y-1">
              {couponDiscount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-warm-gray)]">小計</span>
                    <span>¥{reservation.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[var(--color-sage)]">
                    <span>クーポン割引</span>
                    <span>-¥{couponDiscount.toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-end pt-2">
                <span className="text-sm font-medium">合計（税込）</span>
                <span className="text-2xl font-light text-[var(--color-gold)]">
                  ¥{finalPrice.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-10 space-y-4"
        >
          <Link href="/" className="btn-primary">
            トップページに戻る
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="mt-6">
            <p className="text-xs text-[var(--color-warm-gray)] mb-2">
              ご予約の変更・キャンセルはお電話で
            </p>
            <a
              href="tel:03-1234-5678"
              className="inline-flex items-center gap-2 text-[var(--color-charcoal)] hover:text-[var(--color-sage)] transition-colors"
            >
              <Phone className="w-4 h-4" />
              03-1234-5678
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ReservationCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-cream)] pt-32 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-[var(--color-sage)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[var(--color-warm-gray)]">読み込み中...</p>
          </div>
        </div>
      }
    >
      <ReservationCompleteContent />
    </Suspense>
  );
}
