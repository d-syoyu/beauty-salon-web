import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { parseLocalDateEnd, parseLocalDateStart } from "@/lib/date-utils";
import { reservationDedupDistinct } from "@/lib/reservation-dedup";
import { measureAdminTask, startAdminTimer } from "@/lib/admin-performance";
import ReservationsClient, { type Reservation, type ReservationItem } from "./ReservationsClient";

function getJstTodayStr() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function ReservationsPageFallback() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="rounded-xl border border-border bg-muted/30 min-h-72 animate-pulse" />
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 h-20 animate-pulse" />
          <div className="rounded-xl border border-border bg-muted/30 h-96 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

async function ReservationsPageContent({
  dateStr,
  statusFilter,
  staffFilter,
  searchQuery,
  page,
  highlightId,
}: {
  dateStr: string;
  statusFilter: string;
  staffFilter: string;
  searchQuery: string;
  page: number;
  highlightId: string;
}) {
  const endContentTimer = startAdminTimer("reservations.content.total");
  try {
    const limit = 50;
    const skip = (page - 1) * limit;

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
    measureAdminTask("reservations.query.rows", () =>
      prisma.reservation.findMany({
        where,
        distinct: reservationDedupDistinct,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          staff: { select: { id: true, name: true, image: true } },
          coupon: { select: { id: true, code: true, name: true, type: true, value: true } },
          items: { orderBy: { orderIndex: "asc" } },
        },
        orderBy: dateStr ? { startTime: "asc" } : [{ date: "desc" }, { startTime: "asc" }],
        skip,
        take: limit,
      })
    ),
    measureAdminTask("reservations.query.count", () =>
      prisma.reservation.count({
        where,
      })
    ),
    measureAdminTask("reservations.query.staff", () =>
      prisma.staff.findMany({
        where: { isActive: true },
        select: { id: true, name: true, image: true },
        orderBy: { displayOrder: "asc" },
      })
    ),
    measureAdminTask("reservations.query.categories", () =>
      prisma.category.findMany({
        select: { name: true, color: true },
      })
    ),
    measureAdminTask("reservations.query.menus", () =>
      prisma.menu.findMany({
        select: {
          id: true,
          category: {
            select: { color: true },
          },
        },
      })
    ),
  ]);

    const staffList = rawStaff.map((staff) => ({
    id: staff.id,
    name: staff.name,
    image: staff.image,
  }));
    const categoryColors = Object.fromEntries(
      rawCategories.map((category) => [category.name, category.color])
    );
    const menuCategoryColors = Object.fromEntries(
      rawMenus.map((menu) => [menu.id, menu.category.color])
    );

    const reservations: Reservation[] = rawReservations.map((reservation) => ({
    id: reservation.id,
    totalPrice: reservation.totalPrice,
    totalDuration: reservation.totalDuration,
    menuSummary: reservation.menuSummary,
    date: reservation.date instanceof Date ? reservation.date.toISOString() : String(reservation.date),
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    status: reservation.status as Reservation["status"],
    paymentMethod: reservation.paymentMethod,
    note: reservation.note ?? undefined,
    staffId: reservation.staffId,
    staffName: reservation.staffName,
    couponCode: reservation.couponCode,
    couponDiscount: reservation.couponDiscount,
    coupon: reservation.coupon,
    staff: reservation.staff,
    user: reservation.user,
    items: reservation.items.map((item): ReservationItem => ({
      id: item.id,
      menuId: item.menuId,
      menuName: item.menuName,
      category: item.category,
      price: item.price,
      duration: item.duration,
      orderIndex: item.orderIndex,
    })),
  }));

    return (
      <ReservationsClient
        initialReservations={reservations}
        categoryColors={categoryColors}
        menuCategoryColors={menuCategoryColors}
        staffList={staffList}
        totalPages={Math.ceil(total / limit)}
        dateStr={dateStr}
        statusFilter={statusFilter}
        staffFilter={staffFilter}
        searchQuery={searchQuery}
        page={page}
        highlightId={highlightId}
      />
    );
  } finally {
    endContentTimer();
  }
}

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
  const endPageTimer = startAdminTimer("reservations.page.total");

  try {
    const {
      date: dateParam,
      status: statusParam,
      staffId: staffIdParam,
      search: searchParam,
      page: pageParam,
      highlight: highlightParam,
    } = await searchParams;

    const dateStr = dateParam === "all" ? "" : dateParam || getJstTodayStr();
    const statusFilter = statusParam || "";
    const staffFilter = staffIdParam || "";
    const searchQuery = searchParam || "";
    const page = Math.max(1, parseInt(pageParam || "1"));
    const highlightId = highlightParam || "";

    return (
      <Suspense fallback={<ReservationsPageFallback />}>
        <ReservationsPageContent
          dateStr={dateStr}
          statusFilter={statusFilter}
          staffFilter={staffFilter}
          searchQuery={searchQuery}
          page={page}
          highlightId={highlightId}
        />
      </Suspense>
    );
  } finally {
    endPageTimer();
  }
}
