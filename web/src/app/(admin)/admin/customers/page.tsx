// src/app/(admin)/admin/customers/page.tsx
// RSC: fetches paginated customer list directly via Prisma

import { prisma } from '@/lib/db';
import CustomersClient, { type Customer } from './CustomersClient';

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1'));
  const limit = 50;
  const skip = (page - 1) * limit;

  const where = search
    ? {
        role: 'CUSTOMER' as const,
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    : { role: 'CUSTOMER' as const };

  const [rawCustomers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        newsletterOptOut: true,
        reservations: {
          orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
          take: 20,
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            totalPrice: true,
            totalDuration: true,
            menuSummary: true,
            status: true,
            items: {
              orderBy: { orderIndex: 'asc' },
              select: { id: true, menuName: true, category: true, price: true, duration: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Get completed reservation counts
  const customerIds = rawCustomers.map((c) => c.id);
  const completedCounts = await prisma.reservation.groupBy({
    by: ['userId'],
    where: { userId: { in: customerIds }, status: 'COMPLETED' },
    _count: { id: true },
  });
  const completedMap = new Map(completedCounts.map((c) => [c.userId, c._count.id]));

  const customers: Customer[] = rawCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
    newsletterOptOut: c.newsletterOptOut,
    completedCount: completedMap.get(c.id) ?? 0,
    reservations: c.reservations.map((r) => ({
      id: r.id,
      date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
      startTime: r.startTime,
      endTime: r.endTime,
      totalPrice: r.totalPrice,
      totalDuration: r.totalDuration,
      menuSummary: r.menuSummary,
      status: r.status,
      items: r.items,
    })),
  }));

  return (
    <CustomersClient
      customers={customers}
      page={page}
      totalPages={Math.ceil(total / limit)}
      searchQuery={search || ''}
    />
  );
}
