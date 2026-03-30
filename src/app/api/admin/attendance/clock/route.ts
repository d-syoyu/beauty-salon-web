import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatLocalDate, parseLocalDate } from "@/lib/date-utils";
import { deriveAttendanceMetrics, getEffectiveShift } from "@/lib/workforce-core";
import { ensureAutoLeaveGrants, syncAttendanceFromShift } from "@/lib/workforce-server";

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    await ensureAutoLeaveGrants();

    const body = await request.json();
    const staffId = body.staffId as string | undefined;
    const action = body.action as "clock_in" | "clock_out" | undefined;
    const dateStr = (body.date as string | undefined) || formatLocalDate(new Date());

    if (!staffId || !action) {
      return NextResponse.json({ error: "staffId and action are required." }, { status: 400 });
    }

    const date = parseLocalDate(dateStr);
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        schedules: { where: { isActive: true } },
        scheduleOverrides: { where: { date } },
        leaveRequests: { where: { date, status: "approved" } },
        overtimeRequests: { where: { date, status: "approved" } },
      },
    });
    if (!staff) {
      return NextResponse.json({ error: "Staff not found." }, { status: 404 });
    }

    const shift = getEffectiveShift(staff, date);
    const record = await syncAttendanceFromShift(prisma, staffId, dateStr, shift, user?.id);

    if (action === "clock_in") {
      const updated = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          actualStartTime: record.actualStartTime || nowTime(),
          status: shift?.startTime && record.actualStartTime && record.actualStartTime > shift.startTime ? "late" : "working",
          updatedByUserId: user?.id,
        },
        include: { breaks: true },
      });
      return NextResponse.json(updated);
    }

    const refreshed = await prisma.attendanceRecord.findUnique({
      where: { id: record.id },
      include: { breaks: true },
    });
    if (!refreshed) {
      return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    }

    const totalBreakMinutes = refreshed.breaks.reduce((sum, item) => sum + item.durationMinutes, 0);
    const actualEndTime = nowTime();
    const metrics = deriveAttendanceMetrics({
      shift,
      actualStartTime: refreshed.actualStartTime,
      actualEndTime,
      totalBreakMinutes,
    });

    const updated = await prisma.attendanceRecord.update({
      where: { id: refreshed.id },
      data: {
        actualEndTime,
        totalBreakMinutes,
        totalWorkMinutes: metrics.totalWorkMinutes,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        status: metrics.status,
        updatedByUserId: user?.id,
      },
      include: { breaks: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Attendance clock error:", err);
    return NextResponse.json({ error: "Failed to update attendance." }, { status: 500 });
  }
}
