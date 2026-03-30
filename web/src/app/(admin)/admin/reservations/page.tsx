// src/app/(admin)/admin/reservations/page.tsx
// RSC: fetches reservations and staff list directly via Prisma

import { prisma } from '@/lib/db';
import { parseLocalDateStart, parseLocalDateEnd } from '@/lib/date-utils';
import ReservationsClient, { type Reservation, type ReservationItem } from './ReservationsClient';

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    status?: string;
    staffId?: string;
    search?: string;
    page?: string;
    highlight?: string;
  }>;
}) {
  const { date: dateParam, status: statusParam, staffId: staffIdParam, search: searchParam, page: pageParam, highlight: highlightParam } = await searchParams;

  const dateStr = dateParam || '';
  const statusFilter = statusParam || '';
  const staffFilter = staffIdParam || '';
  const searchQuery = searchParam || '';
  const page = Math.max(1, parseInt(pageParam || '1'));
  const highlightId = highlightParam || '';
  const limit = 50;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};
  if (dateStr) {
    const start = parseLocalDateStart(dateStr);
    const end = parseLocalDateEnd(dateStr);
    where.date = { gte: start, lte: end };
  }
  if (statusFilter) where.status = statusFilter;
  if (staffFilter) where.staffId = staffFilter;
  if (searchQuery) {
    where.user = {
      OR: [
        { name: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { phone: { contains: searchQuery } },
      ],
    };
  }

  const [rawReservations, total, rawStaff, rawCategories, rawMenus] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        staff: { select: { id: true, name: true, image: true } },
        coupon: { select: { id: true, code: true, name: true, type: true, value: true } },
        items: { orderBy: { orderIndex: 'asc' } },
      },
      orderBy: dateStr
        ? { startTime: 'asc' }
        : [{ date: 'desc' }, { startTime: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
    prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, image: true },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.category.findMany({
      select: { name: true, color: true },
    }),
    prisma.menu.findMany({
      select: {
        id: true,
        category: {
          select: { color: true },
        },
      },
    }),
  ]);

  const reservations: Reservation[] = rawReservations.map((r) => ({
    id: r.id,
    totalPrice: r.totalPrice,
    totalDuration: r.totalDuration,
    menuSummary: r.menuSummary,
    date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status as Reservation['status'],
    paymentMethod: r.paymentMethod,
    note: r.note ?? undefined,
    staffId: r.staffId,
    staffName: r.staffName,
    couponCode: r.couponCode,
    couponDiscount: r.couponDiscount,
    coupon: r.coupon,
    staff: r.staff,
    user: r.user,
    items: r.items.map((item): ReservationItem => ({
      id: item.id,
      menuId: item.menuId,
      menuName: item.menuName,
      category: item.category,
      price: item.price,
      duration: item.duration,
      orderIndex: item.orderIndex,
    })),
  }));

  const staffList = rawStaff.map((s) => ({ id: s.id, name: s.name, image: s.image }));
  const categoryColors = Object.fromEntries(rawCategories.map((c) => [c.name, c.color]));
  const menuCategoryColors = Object.fromEntries(rawMenus.map((m) => [m.id, m.category.color]));
  const totalPages = Math.ceil(total / limit);

  return (
    <ReservationsClient
      initialReservations={reservations}
      categoryColors={categoryColors}
      menuCategoryColors={menuCategoryColors}
      staffList={staffList}
      totalPages={totalPages}
      dateStr={dateStr}
      statusFilter={statusFilter}
      staffFilter={staffFilter}
      searchQuery={searchQuery}
      page={page}
      highlightId={highlightId}
    />
  );
}
