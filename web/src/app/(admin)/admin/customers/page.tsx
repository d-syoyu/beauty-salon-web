import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { measureAdminTask, startAdminTimer } from "@/lib/admin-performance";
import CustomersClient, { type Customer } from "./CustomersClient";

function CustomersPageFallback() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 h-24 rounded-xl border border-border bg-muted/30 animate-pulse" />
      <div className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div className="h-16 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-16 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-16 rounded-lg bg-muted/40 animate-pulse" />
      </div>
    </div>
  );
}

async function CustomersPageContent({
  search,
  page,
}: {
  search: string;
  page: number;
}) {
  const endContentTimer = startAdminTimer("customers.content.total");
  try {
    const limit = 50;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          role: "CUSTOMER" as const,
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : { role: "CUSTOMER" as const };

    const rawCustomers = await measureAdminTask("customers.query.users", () =>
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          newsletterOptOut: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      })
    );

    const customerIds = rawCustomers.map((customer) => customer.id);

    const [total, completedCounts, revenueSums] = await Promise.all([
      measureAdminTask("customers.query.count", () => prisma.user.count({ where })),
      customerIds.length === 0
        ? Promise.resolve([])
        : measureAdminTask("customers.query.completed-counts", () =>
            prisma.reservation.groupBy({
              by: ["userId"],
              where: { userId: { in: customerIds }, status: "COMPLETED" },
              _count: { id: true },
            })
          ),
      customerIds.length === 0
        ? Promise.resolve([])
        : measureAdminTask("customers.query.revenue-sums", () =>
            prisma.reservation.groupBy({
              by: ["userId"],
              where: {
                userId: { in: customerIds },
                status: { notIn: ["CANCELLED", "NO_SHOW"] },
              },
              _sum: { totalPrice: true },
            })
          ),
    ]);

    const completedMap = new Map(completedCounts.map((entry) => [entry.userId, entry._count.id]));
    const revenueMap = new Map(revenueSums.map((entry) => [entry.userId, entry._sum.totalPrice ?? 0]));

    const customers: Customer[] = rawCustomers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt:
        customer.createdAt instanceof Date
          ? customer.createdAt.toISOString()
          : String(customer.createdAt),
      newsletterOptOut: customer.newsletterOptOut,
      completedCount: completedMap.get(customer.id) ?? 0,
      totalRevenue: revenueMap.get(customer.id) ?? 0,
    }));

    return (
      <CustomersClient
        customers={customers}
        page={page}
        totalPages={Math.ceil(total / limit)}
        searchQuery={search}
      />
    );
  } finally {
    endContentTimer();
  }
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const endPageTimer = startAdminTimer("customers.page.total");
  try {
    const { search, page: pageParam } = await searchParams;
    const page = Math.max(1, parseInt(pageParam || "1"));

    return (
      <Suspense fallback={<CustomersPageFallback />}>
        <CustomersPageContent search={search || ""} page={page} />
      </Suspense>
    );
  } finally {
    endPageTimer();
  }
}
