'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  AlertTriangle,
  Clock,
  Menu as MenuIcon,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Phone,
  Search,
  X,
  Check,
  Ticket,
  Receipt,
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

type SourceType = 'reservation' | 'walkin';

interface MenuData {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  duration: number;
  displayOrder: number;
  isActive: boolean;
  category: { id: string; name: string; color: string };
}

interface PaymentMethodSetting {
  id: string;
  code: string;
  displayName: string;
  isActive: boolean;
  displayOrder: number;
}

interface PaymentEntry {
  paymentMethod: string;
  amount: number;
}

interface Reservation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  menuSummary: string;
  couponId: string | null;
  couponCode: string | null;
  couponDiscount: number;
  user: { id: string; name: string | null; phone: string | null; email: string | null };
  items: { id: string; menuId: string; menuName: string; category: string; price: number; duration: number }[];
}

interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface AppliedCoupon {
  id: string;
  code: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  discountAmount: number;
  message: string;
}

interface AvailableCoupon {
  id: string;
  code: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  description: string | null;
  validFrom: string;
  validUntil: string;
  minimumAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
}

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { step: 1, label: '会計元・日時', icon: Calendar },
  { step: 2, label: '施術メニュー', icon: MenuIcon },
  { step: 3, label: 'クーポン', icon: Ticket },
  { step: 4, label: '支払・確認', icon: Receipt },
] as const;

export default function NewSalePage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master data
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
  const [taxRate, setTaxRate] = useState(10);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Source
  const [sourceType, setSourceType] = useState<SourceType>('walkin');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Customer search
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  // Menu selection
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [expandedMenuCategories, setExpandedMenuCategories] = useState<string[]>([]);

  // Coupons
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment
  const [payments, setPayments] = useState<PaymentEntry[]>([{ paymentMethod: 'CASH', amount: 0 }]);

  // Date/time/note
  const [saleDate, setSaleDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [saleTime, setSaleTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [note, setNote] = useState('');

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/menus').then(r => r.json()).then(d => setMenus(Array.isArray(d) ? d.filter((m: MenuData) => m.isActive) : [])),
      fetch('/api/admin/payment-methods').then(r => r.json()).then(d => {
        const methods = (Array.isArray(d) ? d : d.paymentMethods || []).filter((pm: PaymentMethodSetting) => pm.isActive);
        setPaymentMethods(methods);
        if (methods.length > 0) setPayments([{ paymentMethod: methods[0].code, amount: 0 }]);
      }),
      fetch('/api/admin/settings').then(r => r.json()).then(d => setTaxRate(d.taxRate || parseInt(d.raw?.tax_rate || '10'))),
      fetch('/api/admin/reservations?status=CONFIRMED').then(r => r.json()).then(d => {
        const today = new Date().toISOString().split('T')[0];
        const list = d.reservations || [];
        setReservations(list.filter((r: Reservation) => r.date >= today));
      }),
      fetch('/api/admin/coupons').then(r => r.json()).then(d => {
        if (Array.isArray(d)) {
          setAvailableCoupons(d.filter((c: AvailableCoupon) => c.isActive));
        }
      }),
    ]).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  // Customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearchQuery) searchCustomers(customerSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearchQuery]);

  const searchCustomers = async (query: string) => {
    if (!query.trim()) { setCustomerSearchResults([]); return; }
    setIsSearchingCustomers(true);
    try {
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setCustomerSearchResults(data.customers || []);
    } catch { /* ignore */ } finally { setIsSearchingCustomers(false); }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedUserId(customer.id);
    setCustomerName(customer.name || '');
    setCustomerPhone(customer.phone || '');
    setShowCustomerSearch(false);
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
  };

  // Reservation
  const selectReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setSelectedUserId(reservation.user.id);
    setCustomerName(reservation.user.name || '');
    setCustomerPhone(reservation.user.phone || '');
    const menuIds = reservation.items.map(item => {
      const dbMenu = menus.find(m => m.name === item.menuName);
      return dbMenu?.id || item.menuId;
    });
    setSelectedMenuIds(menuIds);
    if (reservation.couponId && reservation.couponCode) {
      setCouponCode(reservation.couponCode);
      setAppliedCoupon({
        id: reservation.couponId, code: reservation.couponCode, name: reservation.couponCode,
        type: 'FIXED', value: reservation.couponDiscount, discountAmount: reservation.couponDiscount,
        message: `¥${reservation.couponDiscount.toLocaleString()}割引（予約時適用）`,
      });
    }
  };

  const clearReservation = () => {
    setSelectedReservation(null);
    setSelectedUserId(null);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedMenuIds([]);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Calculations
  const calculateSubtotal = useMemo(() => {
    return selectedMenuIds.reduce((sum, menuId) => {
      const menu = menus.find(m => m.id === menuId);
      return sum + (menu?.price || 0);
    }, 0);
  }, [selectedMenuIds, menus]);

  const getCouponDiscount = useMemo(() => appliedCoupon?.discountAmount || 0, [appliedCoupon]);

  const calculateTax = useMemo(() => {
    const taxInclusiveAmount = Math.max(0, calculateSubtotal - getCouponDiscount);
    return Math.floor(taxInclusiveAmount * taxRate / (100 + taxRate));
  }, [calculateSubtotal, getCouponDiscount, taxRate]);

  const calculateTotal = useMemo(() => {
    return Math.max(0, calculateSubtotal - getCouponDiscount);
  }, [calculateSubtotal, getCouponDiscount]);

  const paymentTotal = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);

  // Coupon validation
  const validateCoupon = async (code: string) => {
    if (!code.trim()) { setCouponError('クーポンコードを入力してください'); return; }
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const categories = selectedMenuIds.map(id => menus.find(m => m.id === id)?.category.name).filter(Boolean);
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, subtotal: calculateSubtotal, customerId: selectedUserId,
          menuIds: selectedMenuIds, categories,
          weekday: new Date(saleDate).getDay(), time: saleTime,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          id: data.coupon.id, code: data.coupon.code, name: data.coupon.name,
          type: data.coupon.type, value: data.coupon.value,
          discountAmount: data.discountAmount, message: data.message,
        });
        setCouponCode(code);
        setSuccess('クーポンを適用しました');
        setTimeout(() => setSuccess(null), 3000);
      } else { setCouponError(data.error); setAppliedCoupon(null); }
    } catch { setCouponError('クーポンの検証に失敗しました'); }
    finally { setIsValidatingCoupon(false); }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(''); setCouponError(null); };

  // Payment methods
  const handleAddPayment = () => {
    const defaultMethod = paymentMethods.length > 0 ? paymentMethods[0].code : 'CASH';
    setPayments([...payments, { paymentMethod: defaultMethod, amount: 0 }]);
  };

  const handleRemovePayment = (index: number) => {
    if (payments.length > 1) setPayments(payments.filter((_, i) => i !== index));
  };

  const handleSetFullAmount = (index: number) => {
    const otherTotal = payments.filter((_, i) => i !== index).reduce((sum, p) => sum + p.amount, 0);
    const newPayments = [...payments];
    newPayments[index].amount = Math.max(0, calculateTotal - otherTotal);
    setPayments(newPayments);
  };

  // Submit
  const showError = (message: string) => { setError(message); setTimeout(() => setError(null), 5000); };

  const handleSubmit = async () => {
    setError(null);
    if (selectedMenuIds.length === 0) { showError('メニューを選択してください'); return; }
    if (paymentTotal !== calculateTotal) {
      showError(`支払総額が合計金額と一致しません（支払: ¥${paymentTotal.toLocaleString()}, 合計: ¥${calculateTotal.toLocaleString()}）`);
      return;
    }
    if (payments.some(p => p.amount <= 0)) { showError('支払金額は1円以上を入力してください'); return; }

    setIsSubmitting(true);
    try {
      const items = selectedMenuIds.map(menuId => {
        const menu = menus.find(m => m.id === menuId);
        return menu ? {
          itemType: 'MENU' as const, menuId: menu.id, menuName: menu.name,
          category: menu.category.name, duration: menu.duration, quantity: 1, unitPrice: menu.price,
        } : null;
      }).filter(Boolean);

      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedReservation?.id,
          userId: selectedUserId || undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          items, payments,
          discountAmount: 0,
          couponId: appliedCoupon?.id,
          couponDiscount: getCouponDiscount,
          saleDate, saleTime, note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showError(data.error || '会計の登録に失敗しました'); return; }
      router.push('/admin/pos/sales');
    } catch { showError('会計の登録に失敗しました'); }
    finally { setIsSubmitting(false); }
  };

  const formatPrice = (price: number) => `¥${price.toLocaleString()}`;

  const formatReservationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const goToNextStep = () => { if (currentStep < 4) setCurrentStep((currentStep + 1) as Step); };
  const goToPrevStep = () => { if (currentStep > 1) setCurrentStep((currentStep - 1) as Step); };

  const canProceedFromStep = (step: Step): boolean => {
    if (step === 1) return selectedReservation ? true : !!(selectedUserId || customerName.trim());
    if (step === 4) return calculateTotal > 0 && paymentTotal === calculateTotal;
    return true;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mb-6">
          <Link href="/admin/pos/sales" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-4 px-3 py-2 -ml-3 min-h-[44px]">
            <ArrowLeft className="w-5 h-5" />
            売上一覧に戻る
          </Link>
          <h1 className="text-2xl font-medium">新規会計登録</h1>
        </motion.div>

        {/* Step Progress */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mb-6">
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-3 sm:p-4 overflow-x-auto">
            {STEPS.map((stepInfo, index) => {
              const Icon = stepInfo.icon;
              const isActive = currentStep === stepInfo.step;
              const isCompleted = currentStep > stepInfo.step;
              return (
                <div key={stepInfo.step} className="flex items-center flex-shrink-0">
                  <button type="button" onClick={() => setCurrentStep(stepInfo.step as Step)}
                    className={`flex flex-col items-center gap-1 px-1 sm:px-2 py-1 rounded-lg transition-colors ${
                      isActive ? 'text-[var(--color-sage)]' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isActive ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/10'
                        : isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium">{stepInfo.label}</span>
                  </button>
                  {index < STEPS.length - 1 && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300 mx-0.5 sm:mx-1 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />{error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5 flex-shrink-0" />{success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {/* Step 1: Source & Date/Time */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[var(--color-gold)]" />会計元
                  </h2>
                  <div className="flex gap-4 mb-4">
                    <button type="button" onClick={() => { setSourceType('reservation'); clearReservation(); }}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${sourceType === 'reservation' ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Calendar className="w-5 h-5 mx-auto mb-1" /><span className="text-sm font-medium">予約から</span>
                    </button>
                    <button type="button" onClick={() => { setSourceType('walkin'); clearReservation(); }}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${sourceType === 'walkin' ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <User className="w-5 h-5 mx-auto mb-1" /><span className="text-sm font-medium">ウォークイン</span>
                    </button>
                  </div>

                  {sourceType === 'reservation' && (
                    <div className="space-y-3">
                      {selectedReservation ? (
                        <div className="p-4 border border-[var(--color-sage)] bg-[var(--color-sage)]/5 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{selectedReservation.user.name || '名前未登録'}</p>
                              <p className="text-sm text-gray-600">{formatReservationDate(selectedReservation.date)} {selectedReservation.startTime}〜{selectedReservation.endTime}</p>
                              <p className="text-sm text-gray-500">{selectedReservation.menuSummary}</p>
                              {selectedReservation.couponCode && (
                                <p className="text-sm text-green-600 mt-1"><Ticket className="w-3 h-3 inline mr-1" />クーポン: {selectedReservation.couponCode}</p>
                              )}
                            </div>
                            <button type="button" onClick={clearReservation} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {reservations.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">予約がありません</p>
                          ) : reservations.map(reservation => (
                            <button key={reservation.id} type="button" onClick={() => selectReservation(reservation)}
                              className="w-full p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 text-left transition-colors">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{reservation.user.name || '名前未登録'}</p>
                                  <p className="text-sm text-gray-600">{formatReservationDate(reservation.date)} {reservation.startTime}〜</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">{reservation.menuSummary}</p>
                                  <p className="text-[var(--color-gold)] font-medium">{formatPrice(reservation.totalPrice)}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {sourceType === 'walkin' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1"><User className="w-4 h-4 inline mr-1" />顧客名</label>
                          <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" placeholder="例: 田中太郎" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="w-4 h-4 inline mr-1" />電話番号</label>
                          <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" placeholder="例: 090-1234-5678" />
                        </div>
                      </div>
                      <button type="button" onClick={() => setShowCustomerSearch(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <Search className="w-4 h-4" />既存顧客から選択
                      </button>
                    </div>
                  )}
                </div>

                {/* Date/Time */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-[var(--color-gold)]" />日時・備考</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">売上日</label>
                      <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">時刻</label>
                      <input type="time" value={saleTime} onChange={e => setSaleTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="メモを入力してください"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {!canProceedFromStep(1) && <p className="text-sm text-red-500">予約を選択するか、顧客情報を入力してください</p>}
                  <button type="button" onClick={goToNextStep} disabled={!canProceedFromStep(1)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    次へ：メニュー選択<ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Menus */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <MenuIcon className="w-5 h-5 text-[var(--color-gold)]" />施術メニュー
                    {selectedMenuIds.length > 0 && <span className="px-2 py-0.5 text-xs bg-[var(--color-gold)] text-white rounded-full">{selectedMenuIds.length}</span>}
                  </h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(() => {
                      const categories = Array.from(new Map(menus.map(m => [m.category.id, m.category])).values());
                      return categories.map(category => {
                        const categoryMenus = menus.filter(m => m.categoryId === category.id).sort((a, b) => a.displayOrder - b.displayOrder);
                        if (categoryMenus.length === 0) return null;
                        const isExpanded = expandedMenuCategories.includes(category.id);
                        const selectedCount = categoryMenus.filter(m => selectedMenuIds.includes(m.id)).length;
                        return (
                          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <button type="button" onClick={() => setExpandedMenuCategories(prev => prev.includes(category.id) ? prev.filter(id => id !== category.id) : [...prev, category.id])}
                              className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors">
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
                              <span className="flex-1 text-left font-medium text-gray-700">{category.name}</span>
                              {selectedCount > 0 && <span className="px-2 py-0.5 text-xs bg-[var(--color-gold)] text-white rounded-full">{selectedCount}</span>}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-t border-gray-200">
                                  <div className="p-2 space-y-1 bg-gray-50">
                                    {categoryMenus.map(menu => (
                                      <label key={menu.id} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-lg hover:border-gray-200 cursor-pointer transition-colors">
                                        <input type="checkbox" checked={selectedMenuIds.includes(menu.id)}
                                          onChange={() => setSelectedMenuIds(prev => prev.includes(menu.id) ? prev.filter(id => id !== menu.id) : [...prev, menu.id])}
                                          className="w-4 h-4 rounded border-gray-300" />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm truncate">{menu.name}</p>
                                          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{menu.duration}分</p>
                                        </div>
                                        <p className="text-[var(--color-gold)] font-medium text-sm flex-shrink-0">{formatPrice(menu.price)}</p>
                                      </label>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {selectedMenuIds.length > 0 && (
                  <div className="bg-[var(--color-sage)]/5 border border-[var(--color-sage)]/20 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">選択中のメニュー</h3>
                    <div className="space-y-2">
                      {selectedMenuIds.map(menuId => {
                        const menu = menus.find(m => m.id === menuId);
                        const reservationItem = selectedReservation?.items.find(item => item.menuId === menuId);
                        const name = menu?.name || reservationItem?.menuName || menuId;
                        const price = menu?.price || reservationItem?.price || 0;
                        const duration = menu?.duration || reservationItem?.duration || 0;
                        return (
                          <div key={menuId} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{name}</p>
                              <p className="text-xs text-gray-500">{duration}分</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[var(--color-gold)] font-medium">{formatPrice(price)}</span>
                              <button type="button" onClick={() => setSelectedMenuIds(prev => prev.filter(id => id !== menuId))} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button type="button" onClick={goToPrevStep} className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    <ArrowLeft className="w-5 h-5" />戻る
                  </button>
                  <button type="button" onClick={goToNextStep} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium">
                    次へ：クーポン<ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Coupons */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Ticket className="w-5 h-5 text-[var(--color-gold)]" />クーポン</h2>
                  <p className="text-sm text-gray-500 mb-4">クーポンがなければスキップしてください</p>

                  {appliedCoupon ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-700">{appliedCoupon.code}</p>
                          <p className="text-sm text-green-600">{appliedCoupon.message}</p>
                        </div>
                        <button type="button" onClick={removeCoupon} className="p-1 text-green-600 hover:text-green-800"><X className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableCoupons.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availableCoupons.map(coupon => {
                            const isLimitReached = coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;
                            const discountText = coupon.type === 'PERCENTAGE' ? `${coupon.value}%OFF` : `¥${coupon.value.toLocaleString()}OFF`;
                            return (
                              <button key={coupon.id} type="button" onClick={() => validateCoupon(coupon.code)}
                                disabled={isValidatingCoupon || isLimitReached}
                                className={`w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors ${
                                  isLimitReached ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-[var(--color-sage)] hover:bg-[var(--color-sage)]/5 cursor-pointer'
                                }`}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{coupon.name}</span>
                                    <span className="px-2 py-0.5 text-xs bg-[var(--color-gold)]/10 text-[var(--color-gold)] rounded">{discountText}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    コード: {coupon.code}
                                    {coupon.minimumAmount && coupon.minimumAmount > 0 && <span className="ml-2">・¥{coupon.minimumAmount.toLocaleString()}以上</span>}
                                  </p>
                                  {isLimitReached && <p className="text-xs text-red-500 mt-0.5">利用上限に達しました</p>}
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                              </button>
                            );
                          })}
                        </div>
                      ) : <p className="text-sm text-gray-500 py-4 text-center">利用可能なクーポンはありません</p>}

                      <details className="border border-gray-200 rounded-lg">
                        <summary className="px-3 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">コードを直接入力</summary>
                        <div className="p-3 pt-0 flex gap-2">
                          <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" placeholder="クーポンコードを入力" />
                          <button type="button" onClick={() => validateCoupon(couponCode)} disabled={isValidatingCoupon || !couponCode.trim()}
                            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isValidatingCoupon ? '検証中...' : '適用'}
                          </button>
                        </div>
                      </details>
                    </div>
                  )}
                  {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
                </div>

                {getCouponDiscount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-red-700 mb-2">適用中の割引</h3>
                    <div className="flex justify-between text-sm text-red-600">
                      <span>クーポン割引</span><span>-{formatPrice(getCouponDiscount)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button type="button" onClick={goToPrevStep} className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    <ArrowLeft className="w-5 h-5" />戻る
                  </button>
                  <button type="button" onClick={goToNextStep} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium">
                    次へ：支払・確認<ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Payment & Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Receipt className="w-5 h-5 text-[var(--color-gold)]" />支払方法</h2>
                  <div className="space-y-3">
                    {payments.map((payment, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <select value={payment.paymentMethod}
                          onChange={e => { const np = [...payments]; np[index].paymentMethod = e.target.value; setPayments(np); }}
                          className="flex-1 min-w-0 px-2 sm:px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm sm:text-base">
                          {paymentMethods.map(method => <option key={method.code} value={method.code}>{method.displayName}</option>)}
                        </select>
                        <input type="number" min="0" value={payment.amount}
                          onChange={e => { const np = [...payments]; np[index].amount = parseInt(e.target.value) || 0; setPayments(np); }}
                          className="w-20 sm:w-28 px-2 sm:px-3 py-2 border border-gray-200 rounded-lg bg-white text-right text-sm sm:text-base" placeholder="0" />
                        <button type="button" onClick={() => handleSetFullAmount(index)}
                          className="px-2 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg whitespace-nowrap flex-shrink-0">全額</button>
                        {payments.length > 1 && (
                          <button type="button" onClick={() => handleRemovePayment(index)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleAddPayment}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Plus className="w-4 h-4" />支払方法を追加
                  </button>
                </div>

                {/* Summary */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-medium mb-4">会計サマリー</h2>

                  {selectedMenuIds.length > 0 && (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">明細</h3>
                      <div className="space-y-2 text-sm">
                        {selectedMenuIds.map(menuId => {
                          const menu = menus.find(m => m.id === menuId);
                          if (!menu) return null;
                          return (
                            <div key={menuId} className="flex justify-between items-center py-1">
                              <span className="text-gray-600">{menu.name}</span>
                              <span>{formatPrice(menu.price)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">小計（税込）</span><span>{formatPrice(calculateSubtotal)}</span>
                    </div>
                    {getCouponDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm text-green-600">
                        <span>クーポン割引</span><span>-{formatPrice(getCouponDiscount)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between text-2xl font-medium">
                        <span>合計（税込）</span><span className="text-[var(--color-gold)]">{formatPrice(calculateTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                        <span>（うち消費税 {taxRate}%）</span><span>{formatPrice(calculateTax)}</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">支払合計</span>
                        <span className={paymentTotal === calculateTotal ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{formatPrice(paymentTotal)}</span>
                      </div>
                      {paymentTotal !== calculateTotal && (
                        <p className="text-xs text-red-500 mt-1">
                          {paymentTotal > calculateTotal ? `¥${(paymentTotal - calculateTotal).toLocaleString()} 多い` : `¥${(calculateTotal - paymentTotal).toLocaleString()} 不足`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button type="button" onClick={goToPrevStep} className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    <ArrowLeft className="w-5 h-5" />戻る
                  </button>
                  <button type="button" onClick={handleSubmit}
                    disabled={isSubmitting || calculateTotal === 0 || paymentTotal !== calculateTotal}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--color-sage)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg">
                    {isSubmitting ? '登録中...' : '会計を登録する'}<Save className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Customer Search Modal */}
      <AnimatePresence>
        {showCustomerSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCustomerSearch(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">顧客検索</h3>
                <button type="button" onClick={() => setShowCustomerSearch(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" placeholder="名前または電話番号で検索" autoFocus />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {isSearchingCustomers ? <p className="text-center text-gray-500 py-4">検索中...</p>
                  : customerSearchResults.length === 0 ? <p className="text-center text-gray-500 py-4">{customerSearchQuery ? '該当する顧客が見つかりません' : '検索キーワードを入力してください'}</p>
                  : (
                    <div className="space-y-2">
                      {customerSearchResults.map(customer => (
                        <button key={customer.id} type="button" onClick={() => selectCustomer(customer)}
                          className="w-full p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 text-left transition-colors">
                          <p className="font-medium">{customer.name || '名前未登録'}</p>
                          {customer.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
                          {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
