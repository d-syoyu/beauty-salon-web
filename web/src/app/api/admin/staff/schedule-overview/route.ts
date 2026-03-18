import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatLocalDate, parseLocalDate } from "@/lib/date-utils";
import { getEffectiveShift } from "@/lib/workforce-core";
import { ensureAutoLeaveGrants } from "@/lib/workforce-server";

function getMonthDays(year: number, month: number) {
  const days: Date[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) {
    days.push(new Date(year, month - 1, day, 12, 0, 0, 0));
  }
  return days;
}

async function loadMonthContext(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const [staff, reservations, pendingCorrections, pendingLeave, pendingOvertime] = await Promise.all([
    prisma.staff.findMany({
      where: { isActive: true },
      include: {
        schedules: { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } },
        scheduleOverrides: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { date: "asc" },
        },
        leaveRequests: {
          where: { date: { gte: startDate, lte: endDate }, status: "approved" },
          orderBy: { date: "asc" },
        },
        overtimeRequests: {
          where: { date: { gte: startDate, lte: endDate }, status: "approved" },
          orderBy: { date: "asc" },
        },
        shiftPatterns: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
        attendanceRecords: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.reservation.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: "CONFIRMED" },
      select: { staffId: true, date: true },
    }),
    prisma.attendanceCorrectionRequest.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: "submitted" },
      select: { staffId: true, date: true },
    }),
    prisma.leaveRequest.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: "submitted" },
      select: { staffId: true, date: true },
    }),
    prisma.overtimeRequest.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: "submitted" },
      select: { staffId: true, date: true },
    }),
  ]);

  return { staff, reservations, pendingCorrections, pendingLeave, pendingOvertime };
}

function buildCalendarSummary(
  year: number,
  month: number,
  staff: Awaited<ReturnType<typeof loadMonthContext>>["staff"],
  reservations: Awaited<ReturnType<typeof loadMonthContext>>["reservations"],
  pendingCorrections: Awaited<ReturnType<typeof loadMonthContext>>["pendingCorrections"],
  pendingLeave: Awaited<ReturnType<typeof loadMonthContext>>["pendingLeave"],
  pendingOvertime: Awaited<ReturnType<typeof loadMonthContext>>["pendingOvertime"]
) {
  const dates = getMonthDays(year, month);
  return dates.map((date) => {
    const dateKey = formatLocalDate(date);
    const workingCount = staff.filter((member) => getEffectiveShift(member, date)?.isWorking).length;
    const leaveCount = staff.filter((member) => getEffectiveShift(member, date)?.status === "leave").length;
    const publishedCount = staff.filter((member) => {
      const shift = getEffectiveShift(member, date);
      return shift?.isWorking && member.scheduleOverrides.some((item) => formatLocalDate(item.date) === dateKey && !!item.publishedAt);
    }).length;
    const reservationCount = reservations.filter((item) => formatLocalDate(item.date) === dateKey).length;
    const pendingRequestCount =
      pendingCorrections.filter((item) => formatLocalDate(item.date) === dateKey).length +
      pendingLeave.filter((item) => formatLocalDate(item.date) === dateKey).length +
      pendingOvertime.filter((item) => formatLocalDate(item.date) === dateKey).length;

    return {
      date: dateKey,
      workingCount,
      leaveCount,
      publishedCount,
      reservationCount,
      pendingRequestCount,
      loadStatus: reservationCount > workingCount ? "tight" : reservationCount === 0 ? "empty" : "healthy",
    };
  });
}

function buildCsvPayload(
  staff: Awaited<ReturnType<typeof loadMonthContext>>["staff"],
  year: number,
  month: number
) {
  const lines = ["staffName,date,startTime,endTime,status,source,note"];
  for (const member of staff) {
    for (const date of getMonthDays(year, month)) {
      const shift = getEffectiveShift(member, date);
      lines.push(
        [
          member.name,
          formatLocalDate(date),
          shift?.startTime || "",
          shift?.endTime || "",
          shift?.status || "off",
          shift?.source || "",
          shift?.note || "",
        ].join(",")
      );
    }
  }
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    await ensureAutoLeaveGrants();

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const format = searchParams.get("format");

    const context = await loadMonthContext(year, month);
    if (format === "csv") {
      return new NextResponse(buildCsvPayload(context.staff, year, month), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="schedule-${year}-${String(month).padStart(2, "0")}.csv"`,
        },
      });
    }

    const calendarSummary = buildCalendarSummary(
      year,
      month,
      context.staff,
      context.reservations,
      context.pendingCorrections,
      context.pendingLeave,
      context.pendingOvertime
    );

    const staff = context.staff.map((member) => ({
      ...member,
      monthlyShifts: getMonthDays(year, month).map((date) => {
        const shift = getEffectiveShift(member, date);
        return {
          date: formatLocalDate(date),
          shift,
          attendance: member.attendanceRecords.find((item) => formatLocalDate(item.date) === formatLocalDate(date)) || null,
        };
      }),
    }));

    return NextResponse.json({ staff, year, month, calendarSummary });
  } catch (err) {
    console.error("Schedule overview error:", err);
    return NextResponse.json({ error: "Failed to load schedule overview." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const action = body.action as "apply_pattern" | "copy_week" | "publish_week" | undefined;
    if (!action) {
      return NextResponse.json({ error: "action is required." }, { status: 400 });
    }

    if (action === "apply_pattern") {
      const pattern = await prisma.shiftPattern.findUnique({
        where: { staffId_code: { staffId: body.staffId, code: body.patternCode } },
      });
      if (!pattern) {
        return NextResponse.json({ error: "Shift pattern not found." }, { status: 404 });
      }
      const override = await prisma.staffScheduleOverride.upsert({
        where: { staffId_date: { staffId: body.staffId, date: parseLocalDate(body.date) } },
        update: {
          startTime: pattern.startTime,
          endTime: pattern.endTime,
          breakMinutes: pattern.breakMinutes,
          status: "scheduled",
          source: "pattern",
          patternCode: pattern.code,
        },
        create: {
          staffId: body.staffId,
          date: parseLocalDate(body.date),
          startTime: pattern.startTime,
          endTime: pattern.endTime,
          breakMinutes: pattern.breakMinutes,
          status: "scheduled",
          source: "pattern",
          patternCode: pattern.code,
        },
      });
      return NextResponse.json(override);
    }

    if (action === "copy_week") {
      const sourceStart = new Date(`${body.sourceWeekStart}T12:00:00`);
      const targetStart = new Date(`${body.targetWeekStart}T12:00:00`);
      const staff = await prisma.staff.findUnique({
        where: { id: body.staffId },
        include: {
          schedules: { where: { isActive: true } },
          scheduleOverrides: true,
          leaveRequests: { where: { status: "approved" } },
          overtimeRequests: { where: { status: "approved" } },
        },
      });
      if (!staff) {
        return NextResponse.json({ error: "Staff not found." }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        for (let offset = 0; offset < 7; offset += 1) {
          const sourceDate = new Date(sourceStart);
          sourceDate.setDate(sourceDate.getDate() + offset);
          const targetDate = new Date(targetStart);
          targetDate.setDate(targetDate.getDate() + offset);
          const shift = getEffectiveShift(staff, sourceDate);
          await tx.staffScheduleOverride.upsert({
            where: { staffId_date: { staffId: staff.id, date: targetDate } },
            update: {
              startTime: shift?.startTime ?? null,
              endTime: shift?.endTime ?? null,
              breakMinutes: shift?.breakMinutes ?? 0,
              status: shift?.status || "off",
              note: shift?.note || null,
              source: "copied_week",
            },
            create: {
              staffId: staff.id,
              date: targetDate,
              startTime: shift?.startTime ?? null,
              endTime: shift?.endTime ?? null,
              breakMinutes: shift?.breakMinutes ?? 0,
              status: shift?.status || "off",
              note: shift?.note || null,
              source: "copied_week",
            },
          });
        }
      });
      return NextResponse.json({ ok: true });
    }

    const weekStart = new Date(`${body.weekStart}T12:00:00`);
    const staffIds: string[] = Array.isArray(body.staffIds) ? body.staffIds : [];
    const staff = await prisma.staff.findMany({
      where: staffIds.length > 0 ? { id: { in: staffIds } } : { isActive: true },
      include: {
        schedules: { where: { isActive: true } },
        scheduleOverrides: true,
        leaveRequests: { where: { status: "approved" } },
        overtimeRequests: { where: { status: "approved" } },
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const member of staff) {
        for (let offset = 0; offset < 7; offset += 1) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + offset);
          const shift = getEffectiveShift(member, date);
          if (!shift) continue;
          await tx.staffScheduleOverride.upsert({
            where: { staffId_date: { staffId: member.id, date } },
            update: {
              startTime: shift.startTime,
              endTime: shift.endTime,
              breakMinutes: shift.breakMinutes,
              status: "published",
              note: shift.note,
              source: shift.source,
              publishedAt: new Date(),
            },
            create: {
              staffId: member.id,
              date,
              startTime: shift.startTime,
              endTime: shift.endTime,
              breakMinutes: shift.breakMinutes,
              status: "published",
              note: shift.note,
              source: shift.source,
              publishedAt: new Date(),
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Schedule overview action error:", err);
    return NextResponse.json({ error: "Failed to update schedule overview." }, { status: 500 });
  }
}
