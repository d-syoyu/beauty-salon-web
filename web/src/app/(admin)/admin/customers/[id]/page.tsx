// src/app/(admin)/admin/customers/[id]/page.tsx
// RSC: fetches customer detail, kartes, staff list directly via Prisma

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import CustomerDetailClient, { type Customer, type Karte, type Staff } from './CustomerDetailClient';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [rawCustomer, rawKartes, rawStaff] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        reservations: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
            menuSummary: true,
            totalPrice: true,
            staffName: true,
          },
          orderBy: { date: 'desc' },
        },
      },
    }),
    prisma.customerKarte.findMany({
      where: { userId: id },
      orderBy: { visitDate: 'desc' },
      include: { sale: { select: { saleNumber: true } } },
    }),
    prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: 'asc' },
    }),
  ]);

  if (!rawCustomer) notFound();

  const customer: Customer = {
    id: rawCustomer.id,
    name: rawCustomer.name,
    email: rawCustomer.email,
    phone: rawCustomer.phone,
    createdAt: rawCustomer.createdAt instanceof Date ? rawCustomer.createdAt.toISOString() : String(rawCustomer.createdAt),
    reservations: rawCustomer.reservations.map((r) => ({
      id: r.id,
      date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
      startTime: r.startTime,
      endTime: r.endTime,
      status: r.status,
      menuSummary: r.menuSummary,
      totalPrice: r.totalPrice,
      staffName: r.staffName,
    })),
  };

  const kartes: Karte[] = rawKartes.map((k) => ({
    id: k.id,
    visitDate: k.visitDate instanceof Date ? k.visitDate.toISOString() : String(k.visitDate),
    staffId: k.staffId,
    staffName: k.staffName,
    treatmentNote: k.treatmentNote,
    chemicalFormula: k.chemicalFormula,
    hairCondition: k.hairCondition,
    nextVisitNote: k.nextVisitNote,
    ngNotes: k.ngNotes,
    photos: k.photos ?? '[]',
    saleId: k.saleId,
    sale: k.sale,
    createdAt: k.createdAt instanceof Date ? k.createdAt.toISOString() : String(k.createdAt),
  }));

  const staffList: Staff[] = rawStaff;

  return (
    <CustomerDetailClient
      customer={customer}
      initialKartes={kartes}
      staffList={staffList}
    />
  );
}
