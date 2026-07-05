'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Mail,
  Phone,
  Send,
  Store,
  Tag,
  User,
} from 'lucide-react';
import MenuSelector, { type MenuCategory, type MenuItem } from '@/components/reservation/MenuSelector';
import CalendarPicker from '@/components/reservation/CalendarPicker';
import TimeSlotGrid, { type TimeSlot } from '@/components/reservation/TimeSlotGrid';
import ReservationSummary from '@/components/reservation/ReservationSummary';
import SquarePayment from '@/components/reservation/SquarePayment';

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

interface StaffMember {
  id: string;
  name: string;
  image: string | null;
  role: string;
}

interface ReservationWizardProps {
  initialMenus: MenuItem[];
  initialCategories: MenuCategory[];
}

const STEPS = [
  { num: 1, label: 'メニュー', detail: 'メニューとスタッフ' },
  { num: 2, label: '日時', detail: '日付と時間' },
  { num: 3, label: '認証', detail: 'LINEまたはメール' },
  { num: 4, label: '会計', detail: '支払いと予約確定' },
];

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStepScrollOffset() {
  return window.innerWidth < 640 ? 88 : 120;
}

export default function ReservationWizard({ initialMenus, initialCategories }: ReservationWizardProps) {
  const router = useRouter();
  const progressStepsRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState(1);
  const [menus] = useState<MenuItem[]>(initialMenus);
  const [categories] = useState<MenuCategory[]>(initialCategories);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [selectedStylist, setSelectedStylist] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [specialOpenDays, setSpecialOpenDays] = useState<string[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'ONSITE'>('ONSITE');

  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedMenus = useMemo(
    () =>
      selectedMenuIds
        .map((id) => menus.find((menu) => menu.id === id))
        .filter((menu): menu is MenuItem => Boolean(menu)),
    [menus, selectedMenuIds],
  );

  const totalPrice = selectedMenus.reduce((sum, menu) => sum + menu.price, 0);
  const couponDiscount = couponResult?.valid ? (couponResult.discountAmount ?? 0) : 0;
  const selectedStaffName = selectedStylist
    ? staffList.find((staff) => staff.id === selectedStylist)?.name
    : undefined;

  const canProceedStep1 = selectedMenuIds.length > 0;
  const canProceedStep2 = Boolean(selectedDate && selectedTime);
  const canSubmit = customerName.trim() !== '' && customerPhone.trim() !== '' && !isSubmitting;

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const response = await fetch(`/api/holidays?year=${year}&month=${month}`);
        const data = await response.json();
        setHolidays(
          (data.holidays || [])
            .filter((holiday: { date: string; startTime: string | null; endTime: string | null }) => !holiday.startTime && !holiday.endTime)
            .map((holiday: { date: string }) => holiday.date),
        );
        setSpecialOpenDays((data.specialOpenDays || []).map((day: { date: string }) => day.date));
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
      }
    };

    void fetchHolidays();
  }, [currentMonth]);

  useEffect(() => {
    if (selectedMenuIds.length === 0) {
      setStaffList([]);
      setSelectedStylist('');
      return;
    }

    setIsLoadingStaff(true);
    fetch(`/api/staff?menuIds=${selectedMenuIds.join(',')}`)
      .then((response) => response.json())
      .then((data) => setStaffList(data.staff || []))
      .catch(() => setStaffList([]))
      .finally(() => setIsLoadingStaff(false));
  }, [selectedMenuIds]);

  useEffect(() => {
    if (staffList.length === 1) {
      setSelectedStylist(staffList[0].id);
    } else if (staffList.length === 0) {
      setSelectedStylist('');
    }
  }, [staffList]);

  useEffect(() => {
    if (!selectedDate || selectedMenuIds.length === 0) return;

    const fetchAvailability = async () => {
      setIsLoadingSlots(true);
      setSelectedTime(null);
      try {
        const params = new URLSearchParams({
          date: formatDateLocal(selectedDate),
          menuIds: selectedMenuIds.join(','),
        });
        if (selectedStylist) params.set('staffId', selectedStylist);
        const response = await fetch(`/api/availability?${params.toString()}`);
        const data = (await response.json()) as AvailabilityData;
        setAvailability(data);
      } catch (error) {
        console.error('Failed to fetch availability:', error);
        setAvailability(null);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    void fetchAvailability();
  }, [selectedDate, selectedMenuIds, selectedStylist]);

  const scrollToProgressSteps = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const top = progressStepsRef.current?.getBoundingClientRect().top;
        if (top === undefined) return;
        window.scrollTo({
          top: Math.max(0, window.scrollY + top - getStepScrollOffset()),
          behavior: 'smooth',
        });
      });
    });
  };

  const goToStep = (target: number) => {
    setStep(target);
    scrollToProgressSteps();
  };

  const handleMenuToggle = (menuId: string) => {
    setSelectedMenuIds((current) =>
      current.includes(menuId) ? current.filter((id) => id !== menuId) : [...current, menuId],
    );
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

  const handleStylistSelect = (staffId: string) => {
    setSelectedStylist(staffId);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailability(null);
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponResult(null);
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal: totalPrice,
          menuIds: selectedMenuIds,
        }),
      });
      setCouponResult(await response.json());
    } catch {
      setCouponResult({ valid: false, error: 'クーポンの確認に失敗しました。' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/reservations', {
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
          stripePaymentIntentId: undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || '予約の登録に失敗しました。');
        return;
      }
      router.push(`/reservation/complete?id=${data.reservation.id}`);
    } catch {
      setSubmitError('予約の登録に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepMotion = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: { duration: 0.25 },
  };

  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-24 sm:pt-32">
      <section className="container-wide pb-6 text-center sm:pb-12">
        <p className="text-subheading mb-2 sm:mb-4">ご予約</p>
        <h1 className="text-display mb-4 sm:mb-6">ご予約</h1>
        <div className="divider-line mx-auto mb-4 sm:mb-8" />
        <p className="mx-auto max-w-lg text-sm text-[var(--color-warm-gray)] sm:text-base">
          メニュー・スタッフ、日時、認証、会計の順にご予約いただけます。
        </p>
      </section>

      <section className="container-wide pb-4 sm:pb-8">
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--color-gold)]/20 bg-gradient-to-r from-[var(--color-gold)]/10 to-[var(--color-gold-light)]/10 p-4 sm:flex-row sm:gap-4 sm:p-6 md:p-8">
          <div className="text-center sm:text-left">
            <p className="mb-1 text-xs text-[var(--color-warm-gray)] sm:text-sm">お急ぎの方・当日予約はお電話で</p>
            <p className="text-xl font-light tracking-wider text-[var(--color-charcoal)] sm:text-2xl">03-1234-5678</p>
          </div>
          <a
            href="tel:03-1234-5678"
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] px-6 py-2.5 text-sm tracking-wider text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(184,149,110,0.3)] sm:px-8 sm:py-3"
          >
            <Phone className="h-4 w-4" />
            電話する
          </a>
        </div>
      </section>

      <div ref={progressStepsRef} className="mb-4 border-y border-[var(--color-light-gray)] bg-white py-3 sm:mb-8 sm:py-5">
        <div className="container-wide">
          <div className="flex items-center justify-center gap-1 sm:gap-3">
            {STEPS.map((item, index) => (
              <div key={item.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all sm:h-10 sm:w-10 sm:text-sm ${
                      step >= item.num
                        ? 'bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-light)] text-white shadow-sm'
                        : 'bg-[var(--color-cream)] text-[var(--color-warm-gray)]'
                    }`}
                    title={item.detail}
                  >
                    {step > item.num ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : item.num}
                  </div>
                  <span className={`mt-1.5 text-[10px] sm:text-xs ${step >= item.num ? 'text-[var(--color-charcoal)]' : 'text-[var(--color-warm-gray)]'}`}>
                    {item.label}
                  </span>
                </div>
                {index < STEPS.length - 1 ? (
                  <div className={`mx-1.5 h-[2px] w-6 transition-all sm:mx-3 sm:w-12 md:w-20 ${step > item.num ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-cream)]'}`} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container-wide pb-16 sm:pb-32">
        <div className="mx-auto max-w-3xl">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="menu" {...stepMotion} className="bg-white p-6 md:p-10">
                <h2 className="mb-2 text-center text-xl font-[family-name:var(--font-serif)]">メニューとスタッフを選択してください</h2>
                <div className="mx-auto mb-8 h-[1px] w-8 bg-[var(--color-gold)]" />
                <MenuSelector
                  categories={categories}
                  menus={menus}
                  selectedMenuIds={selectedMenuIds}
                  onToggle={handleMenuToggle}
                  onClearAll={handleClearMenus}
                />

                {selectedMenuIds.length > 0 ? (
                  <div className="mt-8 border-t border-[var(--color-cream)] pt-8">
                    <h3 className="mb-1 text-center text-sm font-medium">スタッフを選択</h3>
                    <p className="mb-5 text-center text-xs text-[var(--color-warm-gray)]">選択したスタッフの空き時間から日時を選べます。</p>
                    {isLoadingStaff ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="mr-3 h-5 w-5 animate-spin text-[var(--color-sage)]" />
                        <span className="text-sm text-[var(--color-warm-gray)]">スタッフを読み込み中...</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-4">
                        {staffList.length !== 1 ? (
                          <button
                            type="button"
                            onClick={() => handleStylistSelect('')}
                            className={`w-32 border-2 p-4 text-center transition-all ${
                              selectedStylist === '' ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5' : 'border-[var(--color-cream)] hover:border-[var(--color-sage-light)]'
                            }`}
                          >
                            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-cream)]">
                              <User className="h-8 w-8 text-[var(--color-warm-gray)]" />
                            </div>
                            <p className="text-sm font-medium">指名なし</p>
                          </button>
                        ) : null}
                        {staffList.map((staff) => (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => handleStylistSelect(staff.id)}
                            className={`w-32 border-2 p-4 text-center transition-all ${
                              selectedStylist === staff.id ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5' : 'border-[var(--color-cream)] hover:border-[var(--color-sage-light)]'
                            }`}
                          >
                            {staff.image ? (
                              <div className="relative mx-auto mb-2 h-16 w-16 overflow-hidden rounded-full">
                                <Image src={staff.image} alt={staff.name} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-cream)]">
                                <User className="h-8 w-8 text-[var(--color-warm-gray)]" />
                              </div>
                            )}
                            <p className="text-sm font-medium">{staff.name}</p>
                            <p className="text-xs text-[var(--color-warm-gray)]">{staff.role}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-8 flex justify-end">
                  <button type="button" onClick={() => goToStep(2)} disabled={!canProceedStep1} className={`flex items-center gap-2 px-8 py-3 text-sm tracking-wider transition-all ${canProceedStep1 ? 'rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-white hover:-translate-y-0.5' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}>
                    次へ：日時選択
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div key="datetime" {...stepMotion} className="bg-white p-6 md:p-10">
                <h2 className="mb-2 text-center text-xl font-[family-name:var(--font-serif)]">日時を選択してください</h2>
                <div className="mx-auto mb-8 h-[1px] w-8 bg-[var(--color-gold)]" />
                <ReservationSummary selectedMenus={selectedMenus} date={null} time={null} totalPrice={totalPrice} compact />
                <div className="mt-6 space-y-6">
                  <CalendarPicker selectedDate={selectedDate} onSelect={(date) => { setSelectedDate(date); setSelectedTime(null); }} currentMonth={currentMonth} onMonthChange={setCurrentMonth} holidays={holidays} specialOpenDays={specialOpenDays} />
                  {selectedDate ? (
                    <TimeSlotGrid
                      slots={availability?.isClosed ? [] : availability?.slots || []}
                      selectedTime={selectedTime}
                      onSelect={setSelectedTime}
                      isLoading={isLoadingSlots}
                      selectedDate={selectedDate}
                    />
                  ) : null}
                </div>
                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={() => goToStep(1)} className="flex items-center gap-2 px-6 py-3 text-sm text-[var(--color-warm-gray)] hover:text-[var(--color-charcoal)]">
                    <ChevronLeft className="h-4 w-4" />
                    戻る
                  </button>
                  <button type="button" onClick={() => goToStep(3)} disabled={!canProceedStep2} className={`flex items-center gap-2 px-8 py-3 text-sm tracking-wider transition-all ${canProceedStep2 ? 'rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-white hover:-translate-y-0.5' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}>
                    次へ：認証
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ) : null}

            {step === 3 ? (
              <motion.div key="account" {...stepMotion} className="bg-white p-6 md:p-10">
                <h2 className="mb-2 text-center text-xl font-[family-name:var(--font-serif)]">LINEまたはメールで続ける</h2>
                <div className="mx-auto mb-8 h-[1px] w-8 bg-[var(--color-gold)]" />
                <ReservationSummary selectedMenus={selectedMenus} date={selectedDate} time={selectedTime} totalPrice={totalPrice} couponDiscount={couponDiscount} compact />
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => goToStep(4)} className="flex items-center justify-center gap-2 border-2 border-[var(--color-cream)] px-5 py-4 text-sm transition-all hover:border-[var(--color-sage-light)] hover:bg-[var(--color-sage)]/5">
                    <User className="h-4 w-4 text-[var(--color-sage)]" />
                    LINEで続ける
                  </button>
                  <button type="button" onClick={() => goToStep(4)} className="flex items-center justify-center gap-2 border-2 border-[var(--color-cream)] px-5 py-4 text-sm transition-all hover:border-[var(--color-sage-light)] hover:bg-[var(--color-sage)]/5">
                    <Mail className="h-4 w-4 text-[var(--color-sage)]" />
                    メールで続ける
                  </button>
                </div>
                <button type="button" onClick={() => goToStep(4)} className="mt-4 w-full px-5 py-3 text-sm text-[var(--color-warm-gray)] underline-offset-4 hover:text-[var(--color-charcoal)] hover:underline">
                  サンプル予約としてこのまま会計へ進む
                </button>
                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={() => goToStep(2)} className="flex items-center gap-2 px-6 py-3 text-sm text-[var(--color-warm-gray)] hover:text-[var(--color-charcoal)]">
                    <ChevronLeft className="h-4 w-4" />
                    戻る
                  </button>
                  <button type="button" onClick={() => goToStep(4)} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] px-8 py-3 text-sm tracking-wider text-white transition-all hover:-translate-y-0.5">
                    次へ：会計
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ) : null}

            {step === 4 ? (
              <motion.div key="checkout" {...stepMotion} className="bg-white p-6 md:p-10">
                <h2 className="mb-2 text-center text-xl font-[family-name:var(--font-serif)]">会計と予約内容の確認</h2>
                <div className="mx-auto mb-8 h-[1px] w-8 bg-[var(--color-gold)]" />

                <div className="mb-8 space-y-6">
                  <div className="border border-[var(--color-light-gray)] p-5">
                    <h3 className="mb-4 text-sm font-medium">予約者情報</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="mb-2 block text-sm font-medium">お名前 <span className="text-red-400">*</span></label>
                        <input id="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="w-full border-2 border-transparent bg-[var(--color-cream)] px-4 py-3 outline-none transition-all focus:border-[var(--color-sage)]" placeholder="山田 花子" />
                      </div>
                      <div>
                        <label htmlFor="phone" className="mb-2 block text-sm font-medium">電話番号 <span className="text-red-400">*</span></label>
                        <input id="phone" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="w-full border-2 border-transparent bg-[var(--color-cream)] px-4 py-3 outline-none transition-all focus:border-[var(--color-sage)]" placeholder="090-1234-5678" />
                      </div>
                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium">メールアドレス</label>
                        <input id="email" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="w-full border-2 border-transparent bg-[var(--color-cream)] px-4 py-3 outline-none transition-all focus:border-[var(--color-sage)]" placeholder="example@email.com" />
                      </div>
                      <div>
                        <label className="mb-3 block text-sm font-medium">ご来店について</label>
                        <div className="flex gap-4">
                          <button type="button" onClick={() => setIsFirstVisit(true)} className={`flex-1 border-2 p-4 text-center ${isFirstVisit === true ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5' : 'border-[var(--color-cream)]'}`}>初めて</button>
                          <button type="button" onClick={() => setIsFirstVisit(false)} className={`flex-1 border-2 p-4 text-center ${isFirstVisit === false ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5' : 'border-[var(--color-cream)]'}`}>2回目以降</button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="note" className="mb-2 block text-sm font-medium">ご要望・ご相談</label>
                        <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full resize-none border-2 border-transparent bg-[var(--color-cream)] px-4 py-3 outline-none transition-all focus:border-[var(--color-sage)]" placeholder="髪のお悩みやご希望のスタイルなど" />
                      </div>
                      <div>
                        <label htmlFor="coupon" className="mb-2 block text-sm font-medium"><Tag className="mr-1 inline h-4 w-4" />クーポンコード</label>
                        <div className="flex gap-2">
                          <input id="coupon" value={couponCode} onChange={(event) => { setCouponCode(event.target.value); setCouponResult(null); }} className="flex-1 border-2 border-transparent bg-[var(--color-cream)] px-4 py-3 uppercase outline-none transition-all focus:border-[var(--color-sage)]" placeholder="WELCOME10" />
                          <button type="button" onClick={handleValidateCoupon} disabled={!couponCode.trim() || isValidatingCoupon} className={`flex items-center gap-2 px-5 py-3 text-sm tracking-wider transition-all ${couponCode.trim() ? 'rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-white' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}>
                            {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : '適用'}
                          </button>
                        </div>
                        {couponResult ? <p className={`mt-2 text-sm ${couponResult.valid ? 'text-[var(--color-sage)]' : 'text-red-500'}`}>{couponResult.valid ? couponResult.message : couponResult.error}</p> : null}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium">お支払い方法 <span className="text-red-400">*</span></label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => { setPaymentMethod('ONSITE'); setSubmitError(null); }} className={`border-2 p-5 text-left transition-all ${paymentMethod === 'ONSITE' ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5' : 'border-[var(--color-cream)] hover:border-[var(--color-sage-light)]'}`}>
                        <div className="mb-2 flex items-center gap-3"><Store className="h-5 w-5 text-[var(--color-sage)]" /><span className="text-sm font-medium">来店時払い</span></div>
                        <p className="ml-8 text-xs text-[var(--color-warm-gray)]">予約を確定し、当日店舗でお支払い</p>
                      </button>
                      <button type="button" onClick={() => { setPaymentMethod('ONLINE'); setSubmitError(null); }} className={`border-2 p-5 text-left transition-all ${paymentMethod === 'ONLINE' ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5' : 'border-[var(--color-cream)] hover:border-[var(--color-sage-light)]'}`}>
                        <div className="mb-2 flex items-center gap-3"><CreditCard className="h-5 w-5 text-[var(--color-sage)]" /><span className="text-sm font-medium">オンラインカード決済</span></div>
                        <p className="ml-8 text-xs text-[var(--color-warm-gray)]">カード情報を入力して事前決済</p>
                      </button>
                    </div>
                  </div>
                </div>

                <ReservationSummary
                  selectedMenus={selectedMenus}
                  date={selectedDate}
                  time={selectedTime}
                  totalPrice={totalPrice}
                  couponDiscount={couponDiscount}
                  couponName={couponResult?.valid ? couponResult.coupon?.name : undefined}
                  stylistName={selectedStaffName}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  customerEmail={customerEmail || undefined}
                  isFirstVisit={isFirstVisit ?? undefined}
                  note={note || undefined}
                  paymentMethod={paymentMethod}
                />

                {paymentMethod === 'ONLINE' ? (
                  <div className="mt-6 border border-[var(--color-light-gray)] bg-[var(--color-cream)]">
                    <h3 className="flex items-center gap-2 border-b border-[var(--color-light-gray)] px-3 pb-2 pt-3 text-sm font-medium text-[var(--color-charcoal)] sm:px-4 sm:pt-4">
                      <CreditCard className="h-4 w-4 text-[var(--color-gold)]" />
                      カード情報の入力
                    </h3>
                    <SquarePayment onError={(message) => setSubmitError(message)} />
                  </div>
                ) : null}

                {submitError ? <div className="mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-600">{submitError}</div> : null}

                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={() => goToStep(3)} className="flex items-center gap-2 px-6 py-3 text-sm text-[var(--color-warm-gray)] hover:text-[var(--color-charcoal)]">
                    <ChevronLeft className="h-4 w-4" />
                    戻る
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={!canSubmit} className={`flex items-center gap-2 px-10 py-4 text-sm tracking-wider transition-all ${canSubmit ? 'rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-white hover:-translate-y-0.5' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : paymentMethod === 'ONLINE' ? <CreditCard className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {isSubmitting ? '送信中...' : paymentMethod === 'ONLINE' ? '決済して予約を確定する' : '予約を確定する'}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
