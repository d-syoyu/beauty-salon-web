'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, User, BookOpen, Plus, Pencil, Trash2, AlertTriangle, X, Check } from 'lucide-react';

interface Reservation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  menuSummary: string;
  totalPrice: number;
  staffName: string | null;
}

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  reservations: Reservation[];
}

interface Staff {
  id: string;
  name: string;
}

interface Karte {
  id: string;
  visitDate: string;
  staffId: string | null;
  staffName: string | null;
  treatmentNote: string | null;
  chemicalFormula: string | null;
  hairCondition: string | null;
  nextVisitNote: string | null;
  ngNotes: string | null;
  photos: string;
  saleId: string | null;
  sale: { saleNumber: string } | null;
  createdAt: string;
}

const emptyKarte = (): Partial<Karte> => ({
  visitDate: new Date().toISOString().split('T')[0],
  staffId: null,
  staffName: null,
  treatmentNote: null,
  chemicalFormula: null,
  hairCondition: null,
  nextVisitNote: null,
  ngNotes: null,
});

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: '確定', COMPLETED: '完了', CANCELLED: 'キャンセル', PENDING: '仮予約',
};

export default function CustomerDetailPage() {
  const { data: session, status } = useSession();
  const canLoad = status === 'authenticated' && session?.user?.role === 'ADMIN';
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'info' | 'karte'>('info');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [kartes, setKartes] = useState<Karte[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showKarteModal, setShowKarteModal] = useState(false);
  const [editingKarte, setEditingKarte] = useState<Karte | null>(null);
  const [karteForm, setKarteForm] = useState<Partial<Karte>>(emptyKarte());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!canLoad) return;
    Promise.all([
      fetch(`/api/admin/customers/${id}`).then(r => r.json()),
      fetch(`/api/admin/customers/${id}/karte`).then(r => r.json()),
      fetch('/api/admin/staff').then(r => r.json()),
    ]).then(([cData, kData, sData]) => {
      setCustomer(cData.error ? null : cData);
      setKartes(Array.isArray(kData) ? kData : []);
      const list = Array.isArray(sData) ? sData : sData.staff || [];
      setStaffList(list.filter((s: Staff & { isActive: boolean }) => s.isActive));
    }).finally(() => setIsLoading(false));
  }, [canLoad, id]);

  const openCreate = () => {
    setEditingKarte(null);
    setKarteForm(emptyKarte());
    setShowKarteModal(true);
  };

  const openEdit = (k: Karte) => {
    setEditingKarte(k);
    setKarteForm({
      visitDate: k.visitDate.split('T')[0],
      staffId: k.staffId,
      staffName: k.staffName,
      treatmentNote: k.treatmentNote,
      chemicalFormula: k.chemicalFormula,
      hairCondition: k.hairCondition,
      nextVisitNote: k.nextVisitNote,
      ngNotes: k.ngNotes,
    });
    setShowKarteModal(true);
  };

  const handleSaveKarte = async () => {
    if (!karteForm.visitDate) { setError('来店日は必須です'); return; }
    setIsSaving(true);
    setError(null);
    try {
      const url = editingKarte
        ? `/api/admin/customers/${id}/karte/${editingKarte.id}`
        : `/api/admin/customers/${id}/karte`;
      const method = editingKarte ? 'PUT' : 'POST';
      const selectedStaff = staffList.find(s => s.id === karteForm.staffId);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...karteForm, staffName: selectedStaff?.name || karteForm.staffName }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setShowKarteModal(false);
      setSuccess(editingKarte ? 'カルテを更新しました' : 'カルテを作成しました');
      const updated = await fetch(`/api/admin/customers/${id}/karte`).then(r => r.json());
      setKartes(Array.isArray(updated) ? updated : []);
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKarte = async (karteId: string) => {
    if (!confirm('このカルテを削除しますか？')) return;
    await fetch(`/api/admin/customers/${id}/karte/${karteId}`, { method: 'DELETE' });
    const updated = await fetch(`/api/admin/customers/${id}/karte`).then(r => r.json());
    setKartes(Array.isArray(updated) ? updated : []);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">顧客が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/customers" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div>
            <h1 className="text-2xl font-medium">{customer.name || '名前未登録'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{customer.phone} {customer.email && `/ ${customer.email}`}</p>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'info' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-white/50'}`}>
            <User className="w-4 h-4 inline mr-1.5" />基本情報・予約
          </button>
          <button onClick={() => setActiveTab('karte')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'karte' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-white/50'}`}>
            <BookOpen className="w-4 h-4 inline mr-1.5" />カルテ {kartes.length > 0 && `(${kartes.length})`}
          </button>
        </div>

        {/* Tab: Info */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-base font-medium mb-3 text-gray-700">顧客情報</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-gray-500">氏名</dt><dd className="font-medium">{customer.name || '—'}</dd></div>
                <div><dt className="text-gray-500">電話</dt><dd className="font-medium">{customer.phone || '—'}</dd></div>
                <div><dt className="text-gray-500">メール</dt><dd className="font-medium">{customer.email || '—'}</dd></div>
                <div><dt className="text-gray-500">登録日</dt><dd className="font-medium">{new Date(customer.createdAt).toLocaleDateString('ja-JP')}</dd></div>
                <div><dt className="text-gray-500">予約件数</dt><dd className="font-medium">{customer.reservations.length}件</dd></div>
              </dl>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-base font-medium mb-3 text-gray-700">予約履歴</h2>
              {customer.reservations.length === 0 ? (
                <p className="text-sm text-gray-400">予約がありません</p>
              ) : (
                <div className="space-y-2">
                  {customer.reservations.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{new Date(r.date).toLocaleDateString('ja-JP')} {r.startTime}〜{r.endTime}</p>
                        <p className="text-xs text-gray-500">{r.menuSummary}{r.staffName && ` / ${r.staffName}`}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : r.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                        <p className="text-amber-600 font-medium mt-1">¥{r.totalPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Karte */}
        {activeTab === 'karte' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
                <Plus className="w-4 h-4" />新規カルテ
              </button>
            </div>

            {kartes.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>カルテがありません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {kartes.map(karte => (
                  <div key={karte.id} className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{new Date(karte.visitDate).toLocaleDateString('ja-JP')}</p>
                        <p className="text-sm text-gray-500">{karte.staffName || 'スタッフ未記録'}{karte.sale && ` / ${karte.sale.saleNumber}`}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(karte)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteKarte(karte.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <dl className="grid grid-cols-1 gap-2 text-sm">
                      {karte.hairCondition && <div><dt className="text-xs text-gray-400">髪の状態</dt><dd className="whitespace-pre-wrap">{karte.hairCondition}</dd></div>}
                      {karte.treatmentNote && <div><dt className="text-xs text-gray-400">施術メモ</dt><dd className="whitespace-pre-wrap">{karte.treatmentNote}</dd></div>}
                      {karte.chemicalFormula && <div><dt className="text-xs text-gray-400">薬剤配合</dt><dd className="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-2 rounded">{karte.chemicalFormula}</dd></div>}
                      {karte.nextVisitNote && <div><dt className="text-xs text-gray-400">次回提案</dt><dd className="whitespace-pre-wrap text-blue-700">{karte.nextVisitNote}</dd></div>}
                      {karte.ngNotes && <div><dt className="text-xs text-gray-400 text-red-500">NG事項</dt><dd className="whitespace-pre-wrap text-red-600">{karte.ngNotes}</dd></div>}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Karte Modal */}
      {showKarteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowKarteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-medium mb-4">{editingKarte ? 'カルテ編集' : '新規カルテ作成'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">来店日 <span className="text-red-500">*</span></label>
                  <input type="date" value={karteForm.visitDate || ''} onChange={e => setKarteForm(f => ({ ...f, visitDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当スタッフ</label>
                  <select value={karteForm.staffId || ''} onChange={e => setKarteForm(f => ({ ...f, staffId: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]">
                    <option value="">未記録</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">髪の状態</label>
                <textarea value={karteForm.hairCondition || ''} onChange={e => setKarteForm(f => ({ ...f, hairCondition: e.target.value || null }))} rows={2}
                  placeholder="頭皮状態、毛量、ダメージ度合いなど"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">施術メモ</label>
                <textarea value={karteForm.treatmentNote || ''} onChange={e => setKarteForm(f => ({ ...f, treatmentNote: e.target.value || null }))} rows={3}
                  placeholder="施術内容、工程など"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">薬剤配合</label>
                <textarea value={karteForm.chemicalFormula || ''} onChange={e => setKarteForm(f => ({ ...f, chemicalFormula: e.target.value || null }))} rows={2}
                  placeholder="カラー剤名:比率, 処理時間など"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white font-mono text-sm focus:outline-none focus:border-[var(--color-sage)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">次回提案</label>
                <textarea value={karteForm.nextVisitNote || ''} onChange={e => setKarteForm(f => ({ ...f, nextVisitNote: e.target.value || null }))} rows={2}
                  placeholder="次回おすすめメニュー、来店タイミングなど"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-sage)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-red-600">NG事項</label>
                <textarea value={karteForm.ngNotes || ''} onChange={e => setKarteForm(f => ({ ...f, ngNotes: e.target.value || null }))} rows={2}
                  placeholder="アレルギー、避けるべき薬剤、施術など"
                  className="w-full px-3 py-2 border border-red-100 rounded-lg bg-red-50/30 focus:outline-none focus:border-red-300" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowKarteModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">キャンセル</button>
              <button onClick={handleSaveKarte} disabled={isSaving} className="flex-1 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
