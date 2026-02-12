'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Phone,
  User,
  Send,
  ArrowRight,
  Tag,
  Loader2,
  CreditCard,
  Store,
} from 'lucide-react';
import MenuSelector, { type MenuItem, type MenuCategory } from '@/components/reservation/MenuSelector';
import CalendarPicker from '@/components/reservation/CalendarPicker';
import TimeSlotGrid, { type TimeSlot } from '@/components/reservation/TimeSlotGrid';
import ReservationSummary from '@/components/reservation/ReservationSummary';
import StripePayment, { confirmStripePayment } from '@/components/reservation/StripePayment';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AvailabilityData {
  date: string;
  dayOfWeek: number;
  isClosed: boolean;
  slots: TimeSlot[];
  totalDuration?: number;
  totalPrice?: number;
}

interface CouponResult {
  valid: boolean;
  discountAmount?: number;
  message?: string;
  error?: string;
  coupon?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
  };
}

// Step definitions
const STEPS = [
  { num: 1, label: 'メニュー選択', en: 'Menu' },
  { num: 2, label: '日時選択', en: 'Date & Time' },
  { num: 3, label: 'お客様情報', en: 'Information' },
  { num: 4, label: '確認', en: 'Confirm' },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function ReservationPage() {
  const router = useRouter();

  // ---- Step state ----
  const [step, setStep] = useState(1);

  // ---- Step 1: Menu ----
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);

  // ---- Step 2: Date & Time ----
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [specialOpenDays, setSpecialOpenDays] = useState<string[]>([]);

  // ---- Step 3: Customer info ----
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);
  const [selectedStylist, setSelectedStylist] = useState('');
  const [staffList, setStaffList] = useState<{id: string; name: string; image: string | null; role: string}[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'ONSITE'>('ONSITE');

  const handlePaymentMethodChange = (method: 'ONLINE' | 'ONSITE') => {
    setPaymentMethod(method);
    // Reset Stripe state when switching payment methods
    if (method === 'ONSITE') {
      setClientSecret(null);
      setPaymentIntentId(null);
      setIsStripeReady(false);
    }
  };

  // ---- Coupon ----
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // ---- Stripe ----
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isStripeReady, setIsStripeReady] = useState(false);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);

  // ---- Submit ----
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const selectedMenus = selectedMenuIds
    .map((id) => menus.find((m) => m.id === id))
    .filter((m): m is MenuItem => m !== undefined);

  const totalPrice = selectedMenus.reduce((sum, m) => sum + m.price, 0);
  const totalDuration = selectedMenus.reduce((sum, m) => sum + m.duration, 0);
  const couponDiscount = couponResult?.valid ? (couponResult.discountAmount ?? 0) : 0;

  // ---------------------------------------------------------------------------
  // Step validation
  // ---------------------------------------------------------------------------
  const canProceedStep1 = selectedMenuIds.length > 0;
  const canProceedStep2 = selectedDate !== null && selectedTime !== null;
  const canProceedStep3 = customerName.trim() !== '' && customerPhone.trim() !== '';

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  // Fetch menus on mount
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const res = await fetch('/api/menus');
        const data = await res.json();
        setMenus(data.menus || []);
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Failed to fetch menus:', error);
      } finally {
        setIsLoadingMenus(false);
      }
    };
    fetchMenus();
  }, []);

  // Fetch holidays when month changes
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const res = await fetch(`/api/holidays?year=${year}&month=${month}`);
        const data = await res.json();
        const holidayDates = (data.holidays || [])
          .filter((h: { date: string; startTime: string | null; endTime: string | null }) => !h.startTime && !h.endTime)
          .map((h: { date: string }) => h.date);
        setHolidays(holidayDates);
        const specialOpenDates = (data.specialOpenDays || [])
          .map((s: { date: string }) => s.date);
        setSpecialOpenDays(specialOpenDates);
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
      }
    };
    fetchHolidays();
  }, [currentMonth]);

  // Fetch staff when menu selection changes
  useEffect(() => {
    if (selectedMenuIds.length > 0) {
      setIsLoadingStaff(true);
      fetch(`/api/staff?menuIds=${selectedMenuIds.join(',')}`)
        .then(res => res.json())
        .then(data => {
          setStaffList(data.staff || []);
        })
        .catch(() => setStaffList([]))
        .finally(() => setIsLoadingStaff(false));
    } else {
      setStaffList([]);
    }
  }, [selectedMenuIds]);

  // Fetch availability when date, menu, or stylist changes
  useEffect(() => {
    if (selectedDate && selectedMenuIds.length > 0) {
      fetchAvailability(selectedDate, selectedMenuIds, selectedStylist);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedMenuIds, selectedStylist]);

  const fetchAvailability = async (date: Date, menuIds: string[], staffId?: string) => {
    setIsLoadingSlots(true);
    setSelectedTime(null);
    try {
      const dateStr = formatDateLocal(date);
      let url = `/api/availability?date=${dateStr}&menuIds=${menuIds.join(',')}`;
      if (staffId) {
        url += `&staffId=${staffId}`;
      }
      const res = await fetch(url);
      const data: AvailabilityData = await res.json();
      setAvailability(data);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleMenuToggle = (menuId: string) => {
    setSelectedMenuIds((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
    );
    // Reset date/time when menus change
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailability(null);
  };

  const handleClearMenus = () => {
    setSelectedMenuIds([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailability(null);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const goToStep = async (target: number) => {
    // Create PaymentIntent when entering Step 4 with ONLINE payment
    if (target === 4 && paymentMethod === 'ONLINE' && !clientSecret) {
      setIsCreatingPaymentIntent(true);
      try {
        const finalAmount = Math.max(0, totalPrice - couponDiscount);
        const res = await fetch('/api/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalAmount,
            menuSummary: selectedMenus.map((m) => m.name).join('、'),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSubmitError(data.error || '決済の初期化に失敗しました');
          setIsCreatingPaymentIntent(false);
          return;
        }
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      } catch {
        setSubmitError('決済の初期化に失敗しました');
        setIsCreatingPaymentIntent(false);
        return;
      }
      setIsCreatingPaymentIntent(false);
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Coupon validation
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponResult(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal: totalPrice,
          menuIds: selectedMenuIds,
        }),
      });
      const data: CouponResult = await res.json();
      setCouponResult(data);
    } catch {
      setCouponResult({ valid: false, error: 'クーポンの検証に失敗しました' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Submit reservation
  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // If ONLINE payment, confirm Stripe payment first
      if (paymentMethod === 'ONLINE') {
        if (!clientSecret || !paymentIntentId) {
          setSubmitError('決済の準備ができていません。ページを再読み込みしてください。');
          setIsSubmitting(false);
          return;
        }
        try {
          await confirmStripePayment();
        } catch (err) {
          setSubmitError(typeof err === 'string' ? err : '決済に失敗しました');
          setIsSubmitting(false);
          return;
        }
      }

      // Create reservation
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuIds: selectedMenuIds,
          date: formatDateLocal(selectedDate),
          startTime: selectedTime,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          staffId: selectedStylist || undefined,
          isFirstVisit: isFirstVisit ?? undefined,
          note: note.trim() || undefined,
          couponCode: couponResult?.valid ? couponCode.trim() : undefined,
          paymentMethod,
          stripePaymentIntentId: paymentMethod === 'ONLINE' ? paymentIntentId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || '予約の登録に失敗しました');
        return;
      }
      router.push(`/reservation/complete?id=${data.reservation.id}`);
    } catch {
      setSubmitError('予約の登録に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoadingMenus) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[var(--color-sage)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[var(--color-warm-gray)]">メニューを読み込み中...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-32">
      {/* Hero Header */}
      <section className="container-wide pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <p className="text-subheading mb-4">Reservation</p>
          <h1 className="text-display mb-6">ご予約</h1>
          <div className="divider-line mx-auto mb-8" />
          <p className="text-[var(--color-warm-gray)] max-w-lg mx-auto">
            複数のメニューを組み合わせてご予約いただけます。
          </p>
        </motion.div>
      </section>

      {/* Quick Call CTA */}
      <section className="container-wide pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-[var(--color-charcoal)] text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-400 mb-1">お急ぎの方・当日予約はお電話で</p>
            <p className="text-2xl font-light tracking-wider">03-1234-5678</p>
          </div>
          <a
            href="tel:03-1234-5678"
            className="flex items-center gap-2 px-8 py-3 bg-white text-[var(--color-charcoal)] text-sm tracking-wider hover:bg-[var(--color-sage)] hover:text-white transition-all"
          >
            <Phone className="w-4 h-4" />
            今すぐ電話する
          </a>
        </motion.div>
      </section>

      {/* Progress Steps */}
      <div className="bg-white py-5 mb-8 border-y border-[var(--color-light-gray)]">
        <div className="container-wide">
          <div className="flex items-center justify-center gap-1 sm:gap-3">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all ${
                      step >= s.num
                        ? 'bg-[var(--color-sage)] text-white'
                        : 'bg-[var(--color-cream)] text-[var(--color-warm-gray)]'
                    }`}
                  >
                    {step > s.num ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : s.num}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] sm:text-xs transition-colors ${
                      step >= s.num
                        ? 'text-[var(--color-charcoal)]'
                        : 'text-[var(--color-warm-gray)]'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-6 sm:w-12 md:w-20 h-[2px] mx-1.5 sm:mx-3 transition-all ${
                      step > s.num ? 'bg-[var(--color-sage)]' : 'bg-[var(--color-cream)]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container-wide pb-32">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ================================================================ */}
            {/* STEP 1: Menu Selection                                            */}
            {/* ================================================================ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-white p-6 md:p-10">
                  <h2 className="text-xl font-[family-name:var(--font-serif)] mb-2 text-center">
                    ご希望のメニューを選択してください
                  </h2>
                  <div className="w-8 h-[1px] bg-[var(--color-gold)] mx-auto mb-8" />

                  <MenuSelector
                    categories={categories}
                    menus={menus}
                    selectedMenuIds={selectedMenuIds}
                    onToggle={handleMenuToggle}
                    onClearAll={handleClearMenus}
                  />

                  {/* Next Button */}
                  <div className="flex justify-end mt-8">
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      disabled={!canProceedStep1}
                      className={`flex items-center gap-2 px-8 py-3 text-sm tracking-wider transition-all ${
                        canProceedStep1
                          ? 'bg-[var(--color-charcoal)] text-white hover:bg-[var(--color-sage)]'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      次へ：日時選択
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================================================================ */}
            {/* STEP 2: Date & Time Selection                                     */}
            {/* ================================================================ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-white p-6 md:p-10">
                  <h2 className="text-xl font-[family-name:var(--font-serif)] mb-2 text-center">
                    ご希望の日時を選択してください
                  </h2>
                  <div className="w-8 h-[1px] bg-[var(--color-gold)] mx-auto mb-8" />

                  {/* Compact selected menus summary */}
                  <ReservationSummary
                    selectedMenus={selectedMenus}
                    date={null}
                    time={null}
                    totalPrice={totalPrice}
                    compact
                  />

                  <div className="mt-6 space-y-6">
                    {/* Calendar */}
                    <CalendarPicker
                      selectedDate={selectedDate}
                      onSelect={handleDateSelect}
                      currentMonth={currentMonth}
                      onMonthChange={setCurrentMonth}
                      holidays={holidays}
                      specialOpenDays={specialOpenDays}
                    />

                    {/* Time Slots */}
                    {selectedDate && (
                      <TimeSlotGrid
                        slots={availability?.isClosed ? [] : (availability?.slots || [])}
                        selectedTime={selectedTime}
                        onSelect={handleTimeSelect}
                        isLoading={isLoadingSlots}
                        selectedDate={selectedDate}
                      />
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="flex items-center gap-2 px-6 py-3 text-sm text-[var(--color-warm-gray)] hover:text-[var(--color-charcoal)] transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      戻る
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      disabled={!canProceedStep2}
                      className={`flex items-center gap-2 px-8 py-3 text-sm tracking-wider transition-all ${
                        canProceedStep2
                          ? 'bg-[var(--color-charcoal)] text-white hover:bg-[var(--color-sage)]'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      次へ：お客様情報
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================================================================ */}
            {/* STEP 3: Customer Information                                      */}
            {/* ================================================================ */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-white p-6 md:p-10">
                  <h2 className="text-xl font-[family-name:var(--font-serif)] mb-2 text-center">
                    お客様情報を入力してください
                  </h2>
                  <div className="w-8 h-[1px] bg-[var(--color-gold)] mx-auto mb-8" />

                  {/* Compact summary */}
                  <ReservationSummary
                    selectedMenus={selectedMenus}
                    date={selectedDate}
                    time={selectedTime}
                    totalPrice={totalPrice}
                    couponDiscount={couponDiscount}
                    compact
                  />

                  <div className="mt-8 space-y-6">
                    {/* First Visit Toggle */}
                    <div>
                      <label className="block text-sm font-medium mb-3">
                        ご来店について
                      </label>
                      <div className="flex gap-4">
                        <label
                          className={`flex-1 p-4 text-center cursor-pointer border-2 transition-all ${
                            isFirstVisit === true
                              ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5'
                              : 'border-[var(--color-cream)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="isFirstVisit"
                            checked={isFirstVisit === true}
                            onChange={() => setIsFirstVisit(true)}
                            className="sr-only"
                          />
                          <span>初めて</span>
                        </label>
                        <label
                          className={`flex-1 p-4 text-center cursor-pointer border-2 transition-all ${
                            isFirstVisit === false
                              ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5'
                              : 'border-[var(--color-cream)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="isFirstVisit"
                            checked={isFirstVisit === false}
                            onChange={() => setIsFirstVisit(false)}
                            className="sr-only"
                          />
                          <span>2回目以降</span>
                        </label>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        お名前 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all"
                        placeholder="山田 花子"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium mb-2">
                        電話番号 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all"
                        placeholder="090-1234-5678"
                      />
                      <p className="text-xs text-[var(--color-warm-gray)] mt-1">
                        ※確認のお電話をさせていただく場合がございます
                      </p>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        メールアドレス（任意）
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all"
                        placeholder="example@email.com"
                      />
                    </div>

                    {/* Stylist Selection */}
                    <div>
                      <h3 className="text-sm font-medium mb-4">
                        スタイリストを選択（任意）
                      </h3>
                      {isLoadingStaff ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="inline-block w-6 h-6 border-2 border-[var(--color-sage)] border-t-transparent rounded-full animate-spin" />
                          <span className="ml-3 text-sm text-[var(--color-warm-gray)]">スタッフを読み込み中...</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-4">
                          {/* 指名なし option - always first */}
                          <button
                            type="button"
                            onClick={() => setSelectedStylist('')}
                            className={`p-4 text-center transition-all border-2 w-32 ${
                              selectedStylist === ''
                                ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5'
                                : 'border-[var(--color-cream)] hover:border-[var(--color-sage-light)]'
                            }`}
                          >
                            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-[var(--color-cream)] flex items-center justify-center">
                              <User className="w-8 h-8 text-[var(--color-warm-gray)]" />
                            </div>
                            <p className="text-sm font-medium">指名なし</p>
                            <p className="text-xs text-[var(--color-warm-gray)]">
                              スタッフにお任せ
                            </p>
                          </button>
                          {/* Dynamic staff from database */}
                          {staffList.map((staff) => (
                            <button
                              key={staff.id}
                              type="button"
                              onClick={() => setSelectedStylist(staff.id)}
                              className={`p-4 text-center transition-all border-2 w-32 ${
                                selectedStylist === staff.id
                                  ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5'
                                  : 'border-[var(--color-cream)] hover:border-[var(--color-sage-light)]'
                              }`}
                            >
                              {staff.image ? (
                                <div className="relative w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden">
                                  <Image
                                    src={staff.image}
                                    alt={staff.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-[var(--color-cream)] flex items-center justify-center">
                                  <User className="w-8 h-8 text-[var(--color-warm-gray)]" />
                                </div>
                              )}
                              <p className="text-sm font-medium">{staff.name}</p>
                              <p className="text-xs text-[var(--color-warm-gray)]">
                                {staff.role}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    <div>
                      <label htmlFor="note" className="block text-sm font-medium mb-2">
                        ご要望・ご質問（任意）
                      </label>
                      <textarea
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all resize-none"
                        placeholder="髪のお悩みやご希望のスタイルなど"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-medium mb-3">
                        お支払い方法 <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handlePaymentMethodChange('ONSITE')}
                          className={`p-5 text-left transition-all border-2 ${
                            paymentMethod === 'ONSITE'
                              ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5'
                              : 'border-[var(--color-cream)] hover:border-[var(--color-sage-light)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Store className="w-5 h-5 text-[var(--color-sage)]" />
                            <span className="font-medium text-sm">現金払い</span>
                          </div>
                          <p className="text-xs text-[var(--color-warm-gray)] ml-8">
                            ご来店時に現金でお支払い
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaymentMethodChange('ONLINE')}
                          className={`p-5 text-left transition-all border-2 ${
                            paymentMethod === 'ONLINE'
                              ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5'
                              : 'border-[var(--color-cream)] hover:border-[var(--color-sage-light)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="w-5 h-5 text-[var(--color-sage)]" />
                            <span className="font-medium text-sm">クレジットカード決済</span>
                          </div>
                          <p className="text-xs text-[var(--color-warm-gray)] ml-8">
                            クレジットカードで事前にお支払い
                          </p>
                        </button>
                      </div>

                      <AnimatePresence>
                        {paymentMethod === 'ONLINE' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-3 text-xs text-[var(--color-warm-gray)]">
                              ※ 次のステップでカード情報を入力いただきます
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Coupon Code */}
                    <div>
                      <label htmlFor="coupon" className="block text-sm font-medium mb-2">
                        <Tag className="w-4 h-4 inline mr-1" />
                        クーポンコード（任意）
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="coupon"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value);
                            setCouponResult(null);
                          }}
                          className="flex-1 px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all uppercase"
                          placeholder="例: WELCOME10"
                        />
                        <button
                          type="button"
                          onClick={handleValidateCoupon}
                          disabled={!couponCode.trim() || isValidatingCoupon}
                          className={`px-5 py-3 text-sm tracking-wider transition-all flex items-center gap-2 ${
                            couponCode.trim()
                              ? 'bg-[var(--color-charcoal)] text-white hover:bg-[var(--color-sage)]'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isValidatingCoupon ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            '適用'
                          )}
                        </button>
                      </div>
                      {couponResult && (
                        <p
                          className={`mt-2 text-sm ${
                            couponResult.valid
                              ? 'text-[var(--color-sage)]'
                              : 'text-red-500'
                          }`}
                        >
                          {couponResult.valid ? couponResult.message : couponResult.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="flex items-center gap-2 px-6 py-3 text-sm text-[var(--color-warm-gray)] hover:text-[var(--color-charcoal)] transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      戻る
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep(4)}
                      disabled={!canProceedStep3}
                      className={`flex items-center gap-2 px-8 py-3 text-sm tracking-wider transition-all ${
                        canProceedStep3
                          ? 'bg-[var(--color-charcoal)] text-white hover:bg-[var(--color-sage)]'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      次へ：確認
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================================================================ */}
            {/* STEP 4: Confirmation                                              */}
            {/* ================================================================ */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-white p-6 md:p-10">
                  <h2 className="text-xl font-[family-name:var(--font-serif)] mb-2 text-center">
                    ご予約内容をご確認ください
                  </h2>
                  <div className="w-8 h-[1px] bg-[var(--color-gold)] mx-auto mb-8" />

                  {/* Full Summary */}
                  <ReservationSummary
                    selectedMenus={selectedMenus}
                    date={selectedDate}
                    time={selectedTime}
                    totalPrice={totalPrice}
                    couponDiscount={couponDiscount}
                    couponName={couponResult?.valid ? couponResult.coupon?.name : undefined}
                    stylistName={
                      selectedStylist
                        ? staffList.find((s) => s.id === selectedStylist)?.name
                        : undefined
                    }
                    customerName={customerName}
                    customerPhone={customerPhone}
                    customerEmail={customerEmail || undefined}
                    isFirstVisit={isFirstVisit ?? undefined}
                    note={note || undefined}
                    paymentMethod={paymentMethod}
                  />

                  {/* Stripe Payment Element (embedded) */}
                  {paymentMethod === 'ONLINE' && clientSecret && (
                    <div className="mt-6 p-5 bg-[var(--color-cream)] border border-[var(--color-light-gray)]">
                      <StripePayment
                        clientSecret={clientSecret}
                        onReady={() => setIsStripeReady(true)}
                        onError={(msg) => setSubmitError(msg)}
                      />
                    </div>
                  )}

                  {/* Loading PaymentIntent */}
                  {paymentMethod === 'ONLINE' && isCreatingPaymentIntent && (
                    <div className="mt-6 flex items-center justify-center py-8">
                      <div className="inline-block w-6 h-6 border-2 border-[var(--color-sage)] border-t-transparent rounded-full animate-spin" />
                      <span className="ml-3 text-sm text-[var(--color-warm-gray)]">決済フォームを準備中...</span>
                    </div>
                  )}

                  {/* Error message */}
                  {submitError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
                      {submitError}
                    </div>
                  )}

                  {/* Note */}
                  <div className="mt-6 p-4 bg-[var(--color-cream)] text-sm text-[var(--color-warm-gray)]">
                    <p>※ ご予約確定後、確認のお電話またはメールをお送りいたします。</p>
                    <p>※ キャンセルは前日までにご連絡ください。</p>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      className="flex items-center gap-2 px-6 py-3 text-sm text-[var(--color-warm-gray)] hover:text-[var(--color-charcoal)] transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      戻る
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || (paymentMethod === 'ONLINE' && !isStripeReady)}
                      className={`flex items-center gap-2 px-10 py-4 text-sm tracking-wider transition-all ${
                        isSubmitting || (paymentMethod === 'ONLINE' && !isStripeReady)
                          ? 'bg-gray-400 text-white cursor-wait'
                          : 'bg-[var(--color-sage)] text-white hover:bg-[var(--color-sage-dark)]'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {paymentMethod === 'ONLINE' ? '決済処理中...' : '送信中...'}
                        </>
                      ) : (
                        <>
                          {paymentMethod === 'ONLINE' ? (
                            <CreditCard className="w-4 h-4" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          {paymentMethod === 'ONLINE' ? '決済して予約を確定する' : '予約を確定する'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
