import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import ReservationCompleteView from '@/components/reservation/ReservationCompleteView';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-32">
      <div className="container-narrow text-center py-20">
        <p className="text-[var(--color-warm-gray)] mb-8">{message}</p>
        <Link href="/reservation" className="btn-primary">
          予約ページに戻る
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default async function ReservationCompletePage({ searchParams }: Props) {
  const { id } = await searchParams;

  if (!id) {
    return <ErrorView message="予約IDが見つかりません" />;
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      coupon: { select: { id: true, code: true, name: true, type: true, value: true } },
      items: { orderBy: { orderIndex: 'asc' } },
    },
  });

  if (!reservation) {
    return <ErrorView message="予約情報が見つかりませんでした" />;
  }

  const serialized = {
    id: reservation.id,
    date: reservation.date instanceof Date
      ? reservation.date.toISOString().split('T')[0]
      : String(reservation.date),
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    status: reservation.status,
    menuSummary: reservation.menuSummary,
    totalPrice: reservation.totalPrice,
    totalDuration: reservation.totalDuration,
    couponDiscount: reservation.couponDiscount,
    paymentMethod: reservation.paymentMethod,
    note: reservation.note,
    user: reservation.user,
    items: reservation.items,
    coupon: reservation.coupon,
  };

  return <ReservationCompleteView reservation={serialized} />;
}
