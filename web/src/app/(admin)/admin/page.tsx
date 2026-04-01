export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { reservationDedupDistinct } from "@/lib/reservation-dedup";
import { measureAdminTask, startAdminTimer } from "@/lib/admin-performance";
import DashboardClient, {
  type DashboardStats,
  type Holiday,
  type Reservation,
} from "./DashboardClient";

function getJstToday() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const dow = jst.getUTCDay();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const str = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const label = `${year}年${month}月${day}日（${weekdays[dow]}）`;
  return { year, month, day, str, label };
}

function DashboardFallback() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="h-28 rounded-xl border border-border bg-muted/30 animate-pulse" />
        <div className="h-28 rounded-xl border border-border bg-muted/30 animate-pulse" />
        <div className="h-28 rounded-xl border border-border bg-muted/30 animate-pulse" />
      </div>
      <div className="h-96 rounded-xl border border-border bg-muted/30 animate-pulse" />
    </div>
  );
}

async function DashboardContent() {
  const endContentTimer = startAdminTimer("dashboard.content.total");
  try {
    const today = getJstToday();

    const todayStart = new Date(today.year, today.month - 1, today.day, 0, 0, 0, 0);
    const todayEnd = new Date(today.year, today.month - 1, today.day, 23, 59, 59, 999);
    const monthStart = new Date(today.year, today.month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(today.year, today.month, 0, 23, 59, 59, 999);

    const todayDate = new Date(today.year, today.month - 1, today.day);
    const dow = todayDate.getDay();
    const daysToMonday = dow === 0 ? -6 : -(dow - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() + daysToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [rawReservations, todayCount, weekCount, totalReservations, rawHolidays] = await Promise.all([
    measureAdminTask("dashboard.query.today-reservations", () =>
      prisma.reservation.findMany({
        where: { date: { gte: todayStart, lte: todayEnd }, status: "CONFIRMED" },
        distinct: reservationDedupDistinct,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: { orderBy: { orderIndex: "asc" } },
          staff: { select: { id: true, name: true, image: true } },
        },
        orderBy: { startTime: "asc" },
      })
    ),
    measureAdminTask("dashboard.query.today-count", () =>
      prisma.reservation.count({
        where: { date: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
      })
    ),
    measureAdminTask("dashboard.query.week-count", () =>
      prisma.reservation.count({
        where: { date: { gte: weekStart, lte: weekEnd }, status: { not: "CANCELLED" } },
      })
    ),
    measureAdminTask("dashboard.query.total-count", () =>
      prisma.reservation.count({
        where: { status: { not: "CANCELLED" } },
      })
    ),
    measureAdminTask("dashboard.query.holidays", () =>
      prisma.holiday.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        orderBy: { date: "asc" },
      })
    ),
  ]);

    const reservations: Reservation[] = rawReservations.map((reservation) => ({
    id: reservation.id,
    totalPrice: reservation.totalPrice,
    totalDuration: reservation.totalDuration,
    menuSummary: reservation.menuSummary,
    date: reservation.date instanceof Date ? reservation.date.toISOString() : String(reservation.date),
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    status: reservation.status,
    staffId: reservation.staffId,
    staffName: reservation.staffName,
    user: reservation.user,
    staff: reservation.staff,
    items: reservation.items,
  }));

    const todayHolidays: Holiday[] = rawHolidays
      .filter((holiday) => {
        const value =
          holiday.date instanceof Date
            ? holiday.date.toISOString().slice(0, 10)
            : String(holiday.date).slice(0, 10);
        return value === today.str;
      })
      .map((holiday) => ({
        id: holiday.id,
        date: holiday.date instanceof Date ? holiday.date.toISOString() : String(holiday.date),
        startTime: holiday.startTime,
        endTime: holiday.endTime,
        reason: holiday.reason,
      }));

    const stats: DashboardStats = {
      todayCount,
      weekCount,
      totalReservations,
      weekStartStr: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      weekEndStr: `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
    };

    return (
      <DashboardClient
        initialReservations={reservations}
        stats={stats}
        todayHolidays={todayHolidays}
        todayLabel={today.label}
        todayStr={today.str}
      />
    );
  } finally {
    endContentTimer();
  }
}

export default async function AdminDashboard() {
  const endPageTimer = startAdminTimer("dashboard.page.total");

  try {
    return (
      <Suspense fallback={<DashboardFallback />}>
        <DashboardContent />
      </Suspense>
    );
  } finally {
    endPageTimer();
  }
}
