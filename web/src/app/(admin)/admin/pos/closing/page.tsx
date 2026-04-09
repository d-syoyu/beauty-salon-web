import { prisma } from '@/lib/db';
import { getAdminShopContext } from '@/lib/admin-shop';
import { computeDailyClosingSnapshot, computeMonthlyClosingSnapshot } from '@/lib/admin-closing';
import ClosingClient from './ClosingClient';

export const metadata = { title: 'POS Closing | Admin' };

function getTodayInfo() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(now).split('-').map(Number);
  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    year,
    month,
  };
}

export default async function PosClosingPage() {
  const { shops, selectedShopId } = await getAdminShopContext(prisma);
  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? null;
  const today = getTodayInfo();

  const dailySnapshot = await computeDailyClosingSnapshot(prisma, today.date, selectedShopId);
  const monthlySnapshot = await computeMonthlyClosingSnapshot(prisma, today.year, today.month, selectedShopId);

  const [dailyClosing, monthlyClosing] = await Promise.all([
    prisma.dailyClosing.findFirst({
      where: {
        shopId: selectedShopId ?? null,
        date: dailySnapshot.date,
      },
    }),
    prisma.monthlyClosing.findFirst({
      where: {
        shopId: selectedShopId ?? null,
        year: today.year,
        month: today.month,
      },
    }),
  ]);

  return (
    <ClosingClient
      selectedShopId={selectedShopId}
      shopName={selectedShop?.name ?? null}
      todayDate={today.date}
      year={today.year}
      month={today.month}
      initialDailySnapshot={dailySnapshot}
      initialMonthlySnapshot={monthlySnapshot}
      initialDailyClosing={dailyClosing}
      initialMonthlyClosing={monthlyClosing}
    />
  );
}
