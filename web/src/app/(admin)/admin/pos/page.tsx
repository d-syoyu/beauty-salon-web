'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  Banknote,
  Receipt,
  Ticket,
  Settings,
  Clock,
  CreditCard,
  BarChart3,
} from 'lucide-react';

interface SaleItem {
  itemType: 'MENU' | 'PRODUCT';
  menuName: string | null;
  productName: string | null;
  quantity: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string | null;
  saleDate: string;
  saleTime: string;
  totalAmount: number;
  paymentMethod: string;
  items: SaleItem[];
  user: { name: string | null } | null;
}

interface Stats {
  todaySales: number;
  todayCount: number;
  weekSales: number;
  monthSales: number;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: '現金',
  CREDIT_CARD: 'クレジットカード',
  PAYPAY: 'PayPay',
  LINE_PAY: 'LINE Pay',
  BANK_TRANSFER: '銀行振込',
  OTHER: 'その他',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function POSDashboard() {
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const formatLocalDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchData = async () => {
    try {
      const today = new Date();
      const todayStr = formatLocalDate(today);

      const weekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
      weekStart.setDate(weekStart.getDate() + daysToMonday);
      const weekStartStr = formatLocalDate(weekStart);

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthStartStr = formatLocalDate(monthStart);

      const [todayRes, weekRes, monthRes] = await Promise.all([
        fetch(`/api/admin/sales?startDate=${todayStr}&endDate=${todayStr}`),
        fetch(`/api/admin/sales?startDate=${weekStartStr}`),
        fetch(`/api/admin/sales?startDate=${monthStartStr}`),
      ]);

      const todayData: Sale[] = todayRes.ok ? await todayRes.json() : [];
      const weekData: Sale[] = weekRes.ok ? await weekRes.json() : [];
      const monthData: Sale[] = monthRes.ok ? await monthRes.json() : [];

      setTodaySales(Array.isArray(todayData) ? todayData.slice(0, 10) : []);

      setStats({
        todaySales: (Array.isArray(todayData) ? todayData : []).reduce((sum, s) => sum + s.totalAmount, 0),
        todayCount: Array.isArray(todayData) ? todayData.length : 0,
        weekSales: (Array.isArray(weekData) ? weekData : []).reduce((sum, s) => sum + s.totalAmount, 0),
        monthSales: (Array.isArray(monthData) ? monthData : []).reduce((sum, s) => sum + s.totalAmount, 0),
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setStats({ todaySales: 0, todayCount: 0, weekSales: 0, monthSales: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => `¥${price.toLocaleString()}`;
  const today = new Date();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium flex items-center gap-2">
              <CreditCard className="w-6 h-6" /> 会計・売上管理
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日（{WEEKDAYS[today.getDay()]}）
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Banknote className="w-6 h-6 text-green-600" />
              <span className="text-gray-500">本日の売上</span>
            </div>
            <p className="text-3xl font-light">{isLoading ? '-' : formatPrice(stats?.todaySales || 0)}</p>
            <p className="text-sm text-gray-400 mt-1">{stats?.todayCount || 0}件</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <span className="text-gray-500">今週の売上</span>
            </div>
            <p className="text-3xl font-light">{isLoading ? '-' : formatPrice(stats?.weekSales || 0)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              <span className="text-gray-500">今月の売上</span>
            </div>
            <p className="text-3xl font-light">{isLoading ? '-' : formatPrice(stats?.monthSales || 0)}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Link href="/admin/pos/sales/new" className="flex items-center gap-3 p-4 bg-gray-800 text-white rounded-xl shadow-sm hover:bg-gray-700 transition-colors">
            <div className="p-2 bg-white/10 rounded-lg"><CreditCard className="w-5 h-5" /></div>
            <div><p className="font-medium text-sm">新規会計</p><p className="text-xs text-gray-300">会計を作成</p></div>
          </Link>
          <Link href="/admin/pos/sales" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 bg-green-500/10 rounded-lg"><Receipt className="w-5 h-5 text-green-600" /></div>
            <div><p className="font-medium text-sm">売上一覧</p><p className="text-xs text-gray-500">会計管理</p></div>
          </Link>
          <Link href="/admin/pos/coupons" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 bg-amber-500/10 rounded-lg"><Ticket className="w-5 h-5 text-amber-600" /></div>
            <div><p className="font-medium text-sm">クーポン</p><p className="text-xs text-gray-500">クーポン管理</p></div>
          </Link>
          <Link href="/admin/pos/settings" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 bg-gray-500/10 rounded-lg"><Settings className="w-5 h-5 text-gray-600" /></div>
            <div><p className="font-medium text-sm">POS設定</p><p className="text-xs text-gray-500">決済・税率</p></div>
          </Link>
          <Link href="/admin/pos/reports" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            <div><p className="font-medium text-sm">売上分析</p><p className="text-xs text-gray-500">レポート・分析</p></div>
          </Link>
        </div>

        {/* Today's Sales */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-medium">本日の会計</h2>
          </div>
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">読み込み中...</div>
          ) : todaySales.length === 0 ? (
            <div className="p-12 text-center text-gray-500">本日の会計はありません</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todaySales.map((sale) => (
                <div key={sale.id} className="p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-16">
                    <p className="text-sm font-medium">{sale.saleTime}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sale.items.map(item => item.menuName || item.productName).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sale.customerName || sale.user?.name || 'ウォークイン'}
                      {' / '}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}
                      </span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-amber-600">{formatPrice(sale.totalAmount)}</p>
                    <p className="text-xs text-gray-400">{sale.saleNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
