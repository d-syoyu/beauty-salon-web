import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEffectiveShift, deriveAttendanceMetrics } from "@/lib/workforce-core";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const record = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        breaks: true,
        staff: {
          include: {
            schedules: { where: { isActive: true } },
            scheduleOverrides: true,
            leaveRequests: { where: { status: "approved" } },
            overtimeRequests: { where: { status: "approved" } },
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    }

    const targetDate = record.date;
    const shift = getEffectiveShift(
      {
        schedules: record.staff.schedules,
        scheduleOverrides: record.staff.scheduleOverrides.filter((item) => item.date.getTime() === targetDate.getTime()),
        leaveRequests: record.staff.leaveRequests.filter((item) => item.date.getTime() === targetDate.getTime()),
        overtimeRequests: record.staff.overtimeRequests.filter((item) => item.date.getTime() === targetDate.getTime()),
      },
      targetDate
    );

    const totalBreakMinutes =
      typeof body.totalBreakMinutes === "number"
        ? body.totalBreakMinutes
        : record.breaks.reduce((sum, item) => sum + item.durationMinutes, 0);

    const metrics = deriveAttendanceMetrics({
      shift,
      actualStartTime: body.actualStartTime ?? record.actualStartTime,
      actualEndTime: body.actualEndTime ?? record.actualEndTime,
      totalBreakMinutes,
    });

    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        actualStartTime: body.actualStartTime ?? record.actualStartTime,
        actualEndTime: body.actualEndTime ?? record.actualEndTime,
        totalBreakMinutes,
        totalWorkMinutes: metrics.totalWorkMinutes,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        status: metrics.status,
        note: body.note ?? record.note,
        updatedByUserId: user?.id,
      },
      include: { breaks: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Attendance patch error:", err);
    return NextResponse.json({ error: "Failed to update attendance." }, { status: 500 });
  }
}
