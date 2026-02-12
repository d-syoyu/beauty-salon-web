'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, Scissors, Tag, CreditCard, Store } from 'lucide-react';
import { CATEGORY_COLORS } from '@/constants/menu';

interface SelectedMenu {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: {
    name: string;
  };
}

interface ReservationSummaryProps {
  selectedMenus: SelectedMenu[];
  date: Date | null;
  time: string | null;
  totalPrice: number;
  couponDiscount?: number;
  couponName?: string;
  stylistName?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  isFirstVisit?: boolean;
  note?: string;
  paymentMethod?: 'ONLINE' | 'ONSITE';
  compact?: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function ReservationSummary({
  selectedMenus,
  date,
  time,
  totalPrice,
  couponDiscount = 0,
  couponName,
  stylistName,
  customerName,
  customerPhone,
  customerEmail,
  isFirstVisit,
  note,
  paymentMethod,
  compact = false,
}: ReservationSummaryProps) {
  const totalDuration = selectedMenus.reduce((sum, m) => sum + m.duration, 0);
  const finalPrice = Math.max(0, totalPrice - couponDiscount);

  const getCategoryColor = (name: string) => CATEGORY_COLORS[name] || '#6B8E6B';

  if (compact) {
    return (
      <div className="bg-[var(--color-cream)] p-4">
        <p className="text-xs text-[var(--color-warm-gray)] mb-2">ご予約内容</p>
        <div className="flex flex-wrap gap-2 text-sm">
          {selectedMenus.map((menu) => (
            <span key={menu.id} className="bg-white px-3 py-1 text-[var(--color-charcoal)]">
              {menu.name}
            </span>
          ))}
          {date && time && (
            <span className="bg-white px-3 py-1 text-[var(--color-charcoal)]">
              {date.getMonth() + 1}/{date.getDate()}({WEEKDAYS[date.getDay()]}) {time}
            </span>
          )}
          {stylistName && (
            <span className="bg-white px-3 py-1 text-[var(--color-charcoal)]">
              {stylistName}
            </span>
          )}
        </div>
        {couponDiscount > 0 && (
          <div className="mt-2 text-xs text-[var(--color-sage)]">
            クーポン適用: -¥{couponDiscount.toLocaleString()}
          </div>
        )}
        <div className="mt-2 text-right">
          <span className="text-lg font-light text-[var(--color-gold)]">
            ¥{finalPrice.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-[var(--color-light-gray)] p-6"
    >
      <h3 className="text-lg font-[family-name:var(--font-serif)] mb-5 text-center">
        ご予約内容
      </h3>
      <div className="w-8 h-[1px] bg-[var(--color-gold)] mx-auto mb-6" />

      {/* Menus */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Scissors className="w-4 h-4 text-[var(--color-sage)]" />
          <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
            Menu
          </span>
        </div>
        <div className="space-y-2">
          {selectedMenus.map((menu) => {
            const color = getCategoryColor(menu.category.name);
            return (
              <div
                key={menu.id}
                className="flex items-center justify-between py-2 border-b border-[var(--color-cream)]"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm truncate">{menu.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <span className="text-[var(--color-warm-gray)]">{menu.duration}分</span>
                  <span className="text-[var(--color-gold)]">¥{menu.price.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date & Time */}
      {date && time && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[var(--color-sage)]" />
            <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
              Date & Time
            </span>
          </div>
          <p className="text-sm">
            {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日
            （{WEEKDAYS[date.getDay()]}）{time}〜
          </p>
          <p className="text-xs text-[var(--color-warm-gray)] mt-1">
            所要時間: 約{totalDuration}分
          </p>
        </div>
      )}

      {/* Stylist */}
      {stylistName && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
              Stylist
            </span>
          </div>
          <p className="text-sm">{stylistName}</p>
        </div>
      )}

      {/* Customer Info */}
      {customerName && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
              Customer
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <p>{customerName}</p>
            {customerPhone && <p className="text-[var(--color-warm-gray)]">{customerPhone}</p>}
            {customerEmail && <p className="text-[var(--color-warm-gray)]">{customerEmail}</p>}
            {isFirstVisit !== undefined && (
              <p className="text-xs text-[var(--color-warm-gray)]">
                {isFirstVisit ? '初めてのご来店' : '2回目以降のご来店'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Note */}
      {note && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
              Note
            </span>
          </div>
          <p className="text-sm text-[var(--color-warm-gray)] whitespace-pre-wrap">{note}</p>
        </div>
      )}

      {/* Payment Method */}
      {paymentMethod && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-[var(--color-sage)]" />
            <span className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
              Payment
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {paymentMethod === 'ONLINE' ? (
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

      {/* Price Summary */}
      <div className="border-t border-[var(--color-light-gray)] pt-4 mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-warm-gray)]">小計</span>
          <span>¥{totalPrice.toLocaleString()}</span>
        </div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-sage)] flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {couponName || 'クーポン割引'}
            </span>
            <span className="text-[var(--color-sage)]">
              -¥{couponDiscount.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between items-end pt-2 border-t border-[var(--color-light-gray)]">
          <span className="text-sm font-medium">合計（税込）</span>
          <span className="text-2xl font-light text-[var(--color-gold)]">
            ¥{finalPrice.toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
