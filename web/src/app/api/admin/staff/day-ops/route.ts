import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatLocalDate, parseLocalDateEnd, parseLocalDateStart } from "@/lib/date-utils";
import { buildTodayOpsRow, ensureAutoLeaveGrants, getLeaveBalance, loadStaffShiftSubjects } from "@/lib/workforce-server";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    await ensureAutoLeaveGrants();

    const dateStr = request.nextUrl.searchParams.get("date") || formatLocalDate(new Date());
    const date = new Date(`${dateStr}T12:00:00`);
    const start = parseLocalDateStart(dateStr);
    const end = parseLocalDateEnd(dateStr);

    const [staff, reservations, submittedLeaveRequests, submittedOvertimeRequests] = await Promise.all([
      loadStaffShiftSubjects(prisma, dateStr),
      prisma.reservation.findMany({
        where: {
          date: { gte: start, lte: end },
          status: "CONFIRMED",
        },
        select: { staffId: true, startTime: true, endTime: true },
      }),
      prisma.leaveRequest.findMany({
        where: { date: { gte: start, lte: end }, status: "submitted" },
        select: { staffId: true },
      }),
      prisma.overtimeRequest.findMany({
        where: { date: { gte: start, lte: end }, status: "submitted" },
        select: { staffId: true },
      }),
    ]);

    const reservationCounts = new Map<string, number>();
    const pendingCounts = new Map<string, number>();

    for (const reservation of reservations) {
      if (!reservation.staffId) continue;
      reservationCounts.set(reservation.staffId, (reservationCounts.get(reservation.staffId) || 0) + 1);
    }
    for (const requestItem of submittedLeaveRequests) {
      pendingCounts.set(requestItem.staffId, (pendingCounts.get(requestItem.staffId) || 0) + 1);
    }
    for (const requestItem of submittedOvertimeRequests) {
      pendingCounts.set(requestItem.staffId, (pendingCounts.get(requestItem.staffId) || 0) + 1);
    }

    const rows = await Promise.all(
      staff.map(async (member) => {
        const baseRow = buildTodayOpsRow(member, date);
        const leaveBalance = await getLeaveBalance(prisma, member.id);
        return {
          ...baseRow,
          reservationCount: reservationCounts.get(member.id) || 0,
          pendingRequestCount: baseRow.pendingRequestCount + (pendingCounts.get(member.id) || 0),
          leaveBalance,
        };
      })
    );

    const summary = {
      scheduledCount: rows.filter((row) => row.shift?.isWorking).length,
      clockedInCount: rows.filter((row) => row.attendance?.actualStartTime && !row.attendance?.actualEndTime).length,
      onBreakCount: rows.filter((row) => row.activeBreak).length,
      completedCount: rows.filter((row) => row.attendance?.actualEndTime).length,
      alertCount: rows.filter(
        (row) =>
          row.pendingRequestCount > 0 ||
          row.employmentWarning ||
          row.attendance?.status === "late" ||
          row.attendance?.status === "overtime"
      ).length,
    };

    return NextResponse.json({ date: dateStr, summary, rows });
  } catch (err) {
    console.error("Day ops load error:", err);
    return NextResponse.json({ error: "Failed to load day operations." }, { status: 500 });
  }
}
