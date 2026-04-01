import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { parseLocalDateEnd, parseLocalDateStart } from "@/lib/date-utils";
import { measureAdminTask, startAdminTimer } from "@/lib/admin-performance";
import { getEffectiveShift } from "@/lib/workforce-core";
import StaffDayOpsClient from "./StaffDayOpsClient";

function getJstTodayStr(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function StaffPageFallback() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="h-24 rounded-xl border border-border bg-muted/30 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />
        <div className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />
        <div className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />
        <div className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />
      </div>
      <div className="h-96 rounded-xl border border-border bg-muted/30 animate-pulse" />
    </div>
  );
}

async function StaffPageContent({ dateStr }: { dateStr: string }) {
  const endContentTimer = startAdminTimer("staff.content.total");
  try {
    const date = new Date(`${dateStr}T12:00:00`);
    const start = parseLocalDateStart(dateStr);
    const end = parseLocalDateEnd(dateStr);

    const [
      staff,
      reservations,
      submittedLeaveRequests,
      submittedOvertimeRequests,
      submittedCorrectionCount,
      submittedLeaveCount,
      submittedOvertimeCount,
    ] = await Promise.all([
    measureAdminTask("staff.query.overview", () =>
      prisma.staff.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          image: true,
          schedules: {
            where: { isActive: true },
            orderBy: { dayOfWeek: "asc" },
          },
          scheduleOverrides: {
            where: { date: { gte: start, lte: end } },
          },
          leaveRequests: {
            where: { date: { gte: start, lte: end }, status: "approved" },
            select: {
              date: true,
              status: true,
              unit: true,
              startTime: true,
              endTime: true,
              note: true,
            },
          },
          overtimeRequests: {
            where: { date: { gte: start, lte: end }, status: "approved" },
            select: {
              date: true,
              status: true,
              requestedStartTime: true,
              requestedEndTime: true,
              note: true,
              isHolidayWork: true,
            },
          },
          attendanceRecords: {
            where: { date: { gte: start, lte: end } },
            select: {
              actualStartTime: true,
              actualEndTime: true,
              status: true,
              breaks: {
                where: { endTime: null },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      })
    ),
    measureAdminTask("staff.query.reservations", () =>
      prisma.reservation.findMany({
        where: { date: { gte: start, lte: end }, status: "CONFIRMED" },
        select: { staffId: true },
      })
    ),
    measureAdminTask("staff.query.submitted-leave", () =>
      prisma.leaveRequest.findMany({
        where: { date: { gte: start, lte: end }, status: "submitted" },
        select: { staffId: true },
      })
    ),
    measureAdminTask("staff.query.submitted-overtime", () =>
      prisma.overtimeRequest.findMany({
        where: { date: { gte: start, lte: end }, status: "submitted" },
        select: { staffId: true },
      })
    ),
    measureAdminTask("staff.query.pending-corrections", () =>
      prisma.attendanceCorrectionRequest.count({
        where: { status: "submitted" },
      })
    ),
    measureAdminTask("staff.query.pending-leave-total", () =>
      prisma.leaveRequest.count({
        where: { status: "submitted" },
      })
    ),
    measureAdminTask("staff.query.pending-overtime-total", () =>
      prisma.overtimeRequest.count({
        where: { status: "submitted" },
      })
    ),
  ]);

    const reservationCounts = new Map<string, number>();
    const pendingCounts = new Map<string, number>();

    for (const reservation of reservations) {
      if (!reservation.staffId) continue;
      reservationCounts.set(
        reservation.staffId,
        (reservationCounts.get(reservation.staffId) || 0) + 1
      );
    }

    for (const request of submittedLeaveRequests) {
      pendingCounts.set(request.staffId, (pendingCounts.get(request.staffId) || 0) + 1);
    }

    for (const request of submittedOvertimeRequests) {
      pendingCounts.set(request.staffId, (pendingCounts.get(request.staffId) || 0) + 1);
    }

    const rows = staff.map((member) => {
      const shift = getEffectiveShift(member, date);
      const attendance = member.attendanceRecords[0] || null;
      const activeBreak = attendance?.breaks[0] || null;

      return {
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        image: member.image,
        date: dateStr,
        shift,
        attendance: attendance
          ? {
              actualStartTime: attendance.actualStartTime,
              actualEndTime: attendance.actualEndTime,
              status: attendance.status,
            }
          : null,
        activeBreak,
        reservationCount: reservationCounts.get(member.id) || 0,
        pendingRequestCount: pendingCounts.get(member.id) || 0,
        leaveBalance: { remaining: 0 },
      };
    });

    const summary = {
      scheduledCount: rows.filter((row) => row.shift?.isWorking).length,
      clockedInCount: rows.filter(
        (row) => row.attendance?.actualStartTime && !row.attendance?.actualEndTime
      ).length,
      onBreakCount: rows.filter((row) => row.activeBreak).length,
      completedCount: rows.filter((row) => row.attendance?.actualEndTime).length,
      alertCount: rows.filter(
        (row) =>
          row.pendingRequestCount > 0 ||
          row.attendance?.status === "late" ||
          row.attendance?.status === "overtime"
      ).length,
    };

    return (
      <StaffDayOpsClient
        initialDate={dateStr}
        initialDayOps={{ summary, rows }}
        pendingRequestCount={
          submittedCorrectionCount + submittedLeaveCount + submittedOvertimeCount
        }
      />
    );
  } finally {
    endContentTimer();
  }
}

export default async function StaffHomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const endPageTimer = startAdminTimer("staff.page.total");

  try {
    const { date: dateParam } = await searchParams;
    const dateStr = dateParam || getJstTodayStr();

    return (
      <Suspense fallback={<StaffPageFallback />}>
        <StaffPageContent dateStr={dateStr} />
      </Suspense>
    );
  } finally {
    endPageTimer();
  }
}
