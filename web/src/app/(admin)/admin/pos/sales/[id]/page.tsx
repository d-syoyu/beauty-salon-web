'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Check, X, RotateCcw, Ban, Clock } from 'lucide-react';

interface SaleItem {
  id: string;
  itemType: string;
  menuName: string | null;
  productName: string | null;
  category: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Payment {
  id: string;
  paymentMethod: string;
  amount: number;
}

interface AuditLog {
  id: string;
  action: string;
  changedField: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  actedBy: string | null;
  createdAt: string;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string | null;
  staffName: string | null;
  isNominated: boolean;
  saleDate: string;
  saleTime: string;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discountAmount: number;
  couponDiscount: number;
  totalAmount: number;
  refundAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  refundedAt: string | null;
  note: string | null;
  items: SaleItem[];
  payments: Payment[];
  user: { name: string | null; phone: string | null; email: string | null } | null;
  coupon: { code: string; name: string } | null;
  reservation: { id: string; date: string; startTime: string; endTime: string; menuSummary: string } | null;
  staff: { id: string; name: string } | null;
  createdByUser: { name: string | null } | null;
}

const PM_LABELS: Record<string, string> = {
  CASH: '現金', CREDIT_CARD: 'クレジットカード', PAYPAY: 'PayPay',
  LINE_PAY: 'LINE Pay', BANK_TRANSFER: '銀行振込', OTHER: 'その他',
};

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  PAID: { label: '支払済', color: 'bg-green-100 text-green-700' },
  PENDING: { label: '未払い', color: 'bg-yellow-100 text-yellow-700' },
  REFUNDED: { label: '返金済', color: 'bg-blue-100 text-blue-700' },
  PARTIALLY_REFUNDED: { label: '一部返金', color: 'bg-indigo-100 text-indigo-700' },
  CANCELLED: { label: '取消', color: 'bg-gray-100 text-gray-500' },
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: '作成', UPDATE: '更新', REFUND: '返金', CANCEL: '取消', DELETE: '削除',
};

export default function SaleDetailPage() {
  const { data: session, status } = useSession();
  const canLoad = status === 'authenticated' && session?.user?.role === 'ADMIN';
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Refund modal
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // Cancel modal
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!canLoad) return;
    Promise.all([
      fetch(`/api/admin/sales/${id}`).then(r => r.json()),
      fetch(`/api/admin/sales/${id}/audit`).then(r => r.json()),
    ]).then(([saleData, auditData]) => {
      setSale(saleData.error ? null : saleData);
      setAuditLogs(Array.isArray(auditData) ? auditData : []);
    }).finally(() => setIsLoading(false));
  }, [canLoad, id]);

  const handleRefund = async () => {
    if (!refundAmount || !refundReason.trim()) {
      setError('返金額と理由を入力してください');
      return;
    }
    setIsRefunding(true);
    try {
      const res = await fetch(`/api/admin/sales/${id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(refundAmount), reason: refundReason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSale(prev => prev ? { ...prev, ...data } : null);
      setShowRefund(false);
      setSuccess('返金処理が完了しました');
      const logs = await fetch(`/api/admin/sales/${id}/audit`).then(r => r.json());
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } finally {
      setIsRefunding(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError('取消理由を入力してください');
      return;
    }
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/admin/sales/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSale(prev => prev ? { ...prev, ...data } : null);
      setShowCancel(false);
      setSuccess('売上を取消しました');
      const logs = await fetch(`/api/admin/sales/${id}/audit`).then(r => r.json());
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">売上が見つかりません</p>
      </div>
    );
  }

  const canRefund = !['REFUNDED', 'CANCELLED'].includes(sale.paymentStatus);
  const canCancel = sale.paymentStatus !== 'CANCELLED';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/pos/sales" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div>
            <h1 className="text-2xl font-medium">売上詳細</h1>
            <p className="text-sm text-gray-500 mt-0.5">{sale.saleNumber}</p>
          </div>
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[sale.paymentStatus]?.color || 'bg-gray-100'}`}>
              {STATUS_STYLES[sale.paymentStatus]?.label || sale.paymentStatus}
            </span>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />{error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5 flex-shrink-0" />{success}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h2 className="text-base font-medium mb-4 text-gray-700">基本情報</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">日時</dt><dd className="font-medium">{new Date(sale.saleDate).toLocaleDateString('ja-JP')} {sale.saleTime}</dd></div>
            <div><dt className="text-gray-500">顧客</dt><dd className="font-medium">{sale.customerName || sale.user?.name || '—'}</dd></div>
            <div><dt className="text-gray-500">担当</dt><dd className="font-medium">{sale.staffName ? `${sale.staffName}${sale.isNominated ? '（指名）' : ''}` : 'フリー'}</dd></div>
            <div><dt className="text-gray-500">登録者</dt><dd className="font-medium">{sale.createdByUser?.name || '—'}</dd></div>
            {sale.reservation && (
              <div className="col-span-2"><dt className="text-gray-500">連携予約</dt>
                <dd className="font-medium">{new Date(sale.reservation.date).toLocaleDateString('ja-JP')} {sale.reservation.startTime}〜 / {sale.reservation.menuSummary}</dd>
              </div>
            )}
            {sale.note && <div className="col-span-2"><dt className="text-gray-500">備考</dt><dd>{sale.note}</dd></div>}
            {sale.cancelReason && <div className="col-span-2"><dt className="text-gray-500 text-red-500">取消理由</dt><dd className="text-red-600">{sale.cancelReason}</dd></div>}
          </dl>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h2 className="text-base font-medium mb-4 text-gray-700">内訳</h2>
          <div className="space-y-2 mb-4">
            {sale.items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{item.menuName || item.productName}</span>
                  {item.itemType === 'PRODUCT' && <span className="ml-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">店販</span>}
                  {item.quantity > 1 && <span className="ml-1 text-gray-400 text-xs">×{item.quantity}</span>}
                </div>
                <span className="font-medium">¥{item.subtotal.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>小計</span><span>¥{sale.subtotal.toLocaleString()}</span></div>
            {sale.discountAmount > 0 && <div className="flex justify-between text-red-500"><span>割引</span><span>-¥{sale.discountAmount.toLocaleString()}</span></div>}
            {sale.couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>クーポン {sale.coupon?.code}</span><span>-¥{sale.couponDiscount.toLocaleString()}</span></div>}
            <div className="flex justify-between text-gray-500 text-xs"><span>消費税（{sale.taxRate}%内税）</span><span>¥{sale.taxAmount.toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-100">
              <span>合計</span><span className="text-amber-600">¥{sale.totalAmount.toLocaleString()}</span>
            </div>
            {sale.refundAmount > 0 && <div className="flex justify-between text-blue-500"><span>返金額</span><span>-¥{sale.refundAmount.toLocaleString()}</span></div>}
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h2 className="text-base font-medium mb-3 text-gray-700">支払方法</h2>
          {sale.payments.length > 0 ? (
            <div className="space-y-2">
              {sale.payments.map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{PM_LABELS[p.paymentMethod] || p.paymentMethod}</span>
                  <span className="font-medium">¥{p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{PM_LABELS[sale.paymentMethod] || sale.paymentMethod}</p>
          )}
        </div>

        {/* Actions */}
        {(canRefund || canCancel) && (
          <div className="flex gap-3 mb-4">
            {canRefund && (
              <button onClick={() => { setRefundAmount(sale.totalAmount); setShowRefund(true); }}
                className="flex items-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 text-sm font-medium">
                <RotateCcw className="w-4 h-4" />返金処理
              </button>
            )}
            {canCancel && (
              <button onClick={() => setShowCancel(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">
                <Ban className="w-4 h-4" />取消
              </button>
            )}
          </div>
        )}

        {/* Audit Log */}
        {auditLogs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-base font-medium mb-4 text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />監査ログ
            </h2>
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    log.action === 'REFUND' ? 'bg-blue-100 text-blue-700' :
                    log.action === 'CANCEL' ? 'bg-red-100 text-red-600' :
                    log.action === 'DELETE' ? 'bg-gray-100 text-gray-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    {log.changedField && <p className="text-gray-600">{log.changedField}: <span className="line-through text-gray-400">{log.oldValue}</span> → <span className="font-medium">{log.newValue}</span></p>}
                    {log.reason && <p className="text-gray-500">理由: {log.reason}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(log.createdAt).toLocaleString('ja-JP')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {showRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRefund(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-medium mb-4 flex items-center gap-2"><RotateCcw className="w-5 h-5 text-blue-500" />返金処理</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">返金額（円）</label>
                <input type="number" min="1" max={sale.totalAmount} value={refundAmount}
                  onChange={e => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-sage)]" />
                <p className="text-xs text-gray-400 mt-1">合計: ¥{sale.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">返金理由 <span className="text-red-500">*</span></label>
                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-sage)]" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRefund(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">キャンセル</button>
              <button onClick={handleRefund} disabled={isRefunding}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isRefunding ? '処理中...' : '返金する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancel(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-medium mb-4 flex items-center gap-2"><Ban className="w-5 h-5 text-red-500" />売上取消</h3>
            <p className="text-sm text-gray-600 mb-3">取消理由を入力してください。この操作は元に戻せません。</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">キャンセル</button>
              <button onClick={handleCancel} disabled={isCancelling}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isCancelling ? '処理中...' : '取消する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
