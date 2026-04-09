'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type DailySnapshot = {
  totalSales: number;
  saleCount: number;
  totalTax: number;
  totalDiscount: number;
  paymentBreakdown: Record<string, number>;
  expectedCash: number;
};

type MonthlySnapshot = {
  totalSales: number;
  saleCount: number;
  totalTax: number;
  totalDiscount: number;
  paymentBreakdown: Record<string, number>;
  averagePerCustomer: number;
  dailyClosingCount: number;
};

type DailyClosing = {
  status: string;
  actualCash: number | null;
  cashDifference: number | null;
  note: string | null;
  closedAt: string | Date | null;
};

type MonthlyClosing = {
  status: string;
  note: string | null;
  closedAt: string | Date | null;
};

function renderBreakdown(breakdown: Record<string, number>) {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return '支払いなし';
  return entries.map(([key, value]) => `${key}: ¥${value.toLocaleString()}`).join(' / ');
}

function formatClosingStatus(status: string | null | undefined) {
  switch (status) {
    case 'closed':
      return '締め済み';
    case 'open':
    default:
      return '未締め';
  }
}

export default function ClosingClient({
  selectedShopId,
  shopName,
  todayDate,
  year,
  month,
  initialDailySnapshot,
  initialMonthlySnapshot,
  initialDailyClosing,
  initialMonthlyClosing,
}: {
  selectedShopId: string | null;
  shopName: string | null;
  todayDate: string;
  year: number;
  month: number;
  initialDailySnapshot: DailySnapshot;
  initialMonthlySnapshot: MonthlySnapshot;
  initialDailyClosing: DailyClosing | null;
  initialMonthlyClosing: MonthlyClosing | null;
}) {
  const [dailySnapshot, setDailySnapshot] = useState(initialDailySnapshot);
  const [monthlySnapshot, setMonthlySnapshot] = useState(initialMonthlySnapshot);
  const [dailyClosing, setDailyClosing] = useState(initialDailyClosing);
  const [monthlyClosing, setMonthlyClosing] = useState(initialMonthlyClosing);
  const [dailyActualCash, setDailyActualCash] = useState(
    initialDailyClosing?.actualCash?.toString() ?? initialDailySnapshot.expectedCash.toString(),
  );
  const [dailyNote, setDailyNote] = useState(initialDailyClosing?.note ?? '');
  const [monthlyNote, setMonthlyNote] = useState(initialMonthlyClosing?.note ?? '');
  const [savingDaily, setSavingDaily] = useState(false);
  const [savingMonthly, setSavingMonthly] = useState(false);

  const closeDaily = async () => {
    setSavingDaily(true);
    try {
      const response = await fetch('/api/admin/closing/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayDate,
          actualCash: Number(dailyActualCash),
          note: dailyNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '日次締め処理に失敗しました。');

      setDailySnapshot(data.snapshot);
      setDailyClosing(data.closing);
      toast.success('日次締めを保存しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '日次締め処理に失敗しました。');
    } finally {
      setSavingDaily(false);
    }
  };

  const closeMonthly = async () => {
    setSavingMonthly(true);
    try {
      const response = await fetch('/api/admin/closing/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month,
          note: monthlyNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '月次締め処理に失敗しました。');

      setMonthlySnapshot(data.snapshot);
      setMonthlyClosing(data.closing);
      toast.success('月次締めを保存しました。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '月次締め処理に失敗しました。');
    } finally {
      setSavingMonthly(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">POS 締め処理</h1>
        <p className="mt-1 text-sm text-slate-500">
          {shopName ? `${shopName} の締め処理` : '全店舗の締め処理を確認します。'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">日次締め</h2>
            <p className="mt-1 text-sm text-slate-500">{todayDate}</p>
          </div>

          <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p>売上合計: ¥{dailySnapshot.totalSales.toLocaleString()}</p>
            <p>会計件数: {dailySnapshot.saleCount}</p>
            <p>税額: ¥{dailySnapshot.totalTax.toLocaleString()}</p>
            <p>値引き: ¥{dailySnapshot.totalDiscount.toLocaleString()}</p>
            <p>想定現金: ¥{dailySnapshot.expectedCash.toLocaleString()}</p>
            <p>支払内訳: {renderBreakdown(dailySnapshot.paymentBreakdown)}</p>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">実残高</span>
              <input
                type="number"
                value={dailyActualCash}
                onChange={(event) => setDailyActualCash(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">メモ</span>
              <textarea
                rows={4}
                value={dailyNote}
                onChange={(event) => setDailyNote(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
              <p>
                状態: <span className="font-medium text-slate-900">{formatClosingStatus(dailyClosing?.status)}</span>
              </p>
              <p className="mt-1">
                締め日時:{' '}
                {dailyClosing?.closedAt ? new Date(dailyClosing.closedAt).toLocaleString() : '未締め'}
              </p>
              <p className="mt-1">
                現金差異:{' '}
                {dailyClosing?.cashDifference != null
                  ? `¥${dailyClosing.cashDifference.toLocaleString()}`
                  : '未計算'}
              </p>
            </div>

            <button
              onClick={closeDaily}
              disabled={savingDaily}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {savingDaily ? '保存中...' : dailyClosing ? '日次締めを更新' : '本日分を締める'}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">月次締め</h2>
            <p className="mt-1 text-sm text-slate-500">
              {year}-{String(month).padStart(2, '0')}
            </p>
          </div>

          <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p>売上合計: ¥{monthlySnapshot.totalSales.toLocaleString()}</p>
            <p>会計件数: {monthlySnapshot.saleCount}</p>
            <p>平均客単価: ¥{monthlySnapshot.averagePerCustomer.toLocaleString()}</p>
            <p>税額: ¥{monthlySnapshot.totalTax.toLocaleString()}</p>
            <p>値引き: ¥{monthlySnapshot.totalDiscount.toLocaleString()}</p>
            <p>締め済み日数: {monthlySnapshot.dailyClosingCount}</p>
            <p>支払内訳: {renderBreakdown(monthlySnapshot.paymentBreakdown)}</p>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">メモ</span>
              <textarea
                rows={4}
                value={monthlyNote}
                onChange={(event) => setMonthlyNote(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
              <p>
                状態: <span className="font-medium text-slate-900">{formatClosingStatus(monthlyClosing?.status)}</span>
              </p>
              <p className="mt-1">
                締め日時:{' '}
                {monthlyClosing?.closedAt ? new Date(monthlyClosing.closedAt).toLocaleString() : '未締め'}
              </p>
              <p className="mt-1">対象: {selectedShopId ? shopName : '全店舗'}</p>
            </div>

            <button
              onClick={closeMonthly}
              disabled={savingMonthly}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {savingMonthly ? '保存中...' : monthlyClosing ? '月次締めを更新' : '当月を締める'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
