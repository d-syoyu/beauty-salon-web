import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEffectiveShift } from "@/lib/workforce-core";
import { ensureAutoLeaveGrants, getLeaveBalance, getMonthlyClosureBlockers } from "@/lib/workforce-server";

function getMonthDays(year: number, month: number) {
  const days: Date[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) {
    days.push(new Date(year, month - 1, day, 12, 0, 0, 0));
  }
  return days;
}

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    await ensureAutoLeaveGrants();

    const year = parseInt(request.nextUrl.searchParams.get("year") || String(new Date().getFullYear()), 10);
    const month = parseInt(request.nextUrl.searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const monthDays = getMonthDays(year, month);

    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      include: {
        schedules: { where: { isActive: true } },
        scheduleOverrides: { where: { date: { gte: start, lte: end } } },
        leaveRequests: { where: { date: { gte: start, lte: end }, status: "approved" } },
        overtimeRequests: { where: { date: { gte: start, lte: end }, status: "approved" } },
        attendanceRecords: { where: { date: { gte: start, lte: end } } },
      },
      orderBy: { displayOrder: "asc" },
    });

    const rows = await Promise.all(
      staff.map(async (member) => {
        const scheduledDays = monthDays.filter((date) => getEffectiveShift(member, date)?.isWorking).length;
        const attendedDays = member.attendanceRecords.filter((record) => !!record.actualStartTime).length;
        const lateCount = member.attendanceRecords.filter((record) => record.lateMinutes > 0).length;
        const overtimeMinutes = member.attendanceRecords.reduce((sum, record) => sum + record.overtimeMinutes, 0);
        const blockers = await getMonthlyClosureBlockers(prisma, member.id, year, month);
        const leaveBalance = await getLeaveBalance(prisma, member.id);
        const closure = await prisma.attendanceMonthlyClosure.findUnique({
          where: { staffId_year_month: { staffId: member.id, year, month } },
        });

        return {
          staffId: member.id,
          staffName: member.name,
          role: member.role,
          scheduledDays,
          attendedDays,
          lateCount,
          overtimeMinutes,
          pendingClosureBlockers: blockers,
          leaveBalance,
          closureStatus: closure?.status || "open",
        };
      })
    );

    return NextResponse.json({ year, month, rows });
  } catch (err) {
    console.error("Monthly summary error:", err);
    return NextResponse.json({ error: "Failed to load monthly summary." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const year = Number(body.year);
    const month = Number(body.month);
    const action = body.action as "close" | "reopen";

    if (!year || !month || !action) {
      return NextResponse.json({ error: "year, month, and action are required." }, { status: 400 });
    }

    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const results = await prisma.$transaction(async (tx) => {
      const mutations = [];
      for (const member of staff) {
        const blockers = action === "close" ? await getMonthlyClosureBlockers(tx, member.id, year, month) : [];
        mutations.push(
          tx.attendanceMonthlyClosure.upsert({
            where: { staffId_year_month: { staffId: member.id, year, month } },
            update: {
              status: action === "close" && blockers.length === 0 ? "closed" : "open",
              blockedReason: blockers.length > 0 ? blockers.join(",") : null,
              closedAt: action === "close" && blockers.length === 0 ? new Date() : null,
              closedByUserId: action === "close" && blockers.length === 0 ? user?.id : null,
            },
            create: {
              staffId: member.id,
              year,
              month,
              status: action === "close" && blockers.length === 0 ? "closed" : "open",
              blockedReason: blockers.length > 0 ? blockers.join(",") : null,
              closedAt: action === "close" && blockers.length === 0 ? new Date() : null,
              closedByUserId: action === "close" && blockers.length === 0 ? user?.id : null,
            },
          })
        );
      }
      return Promise.all(mutations);
    });

    return NextResponse.json({ action, count: results.length });
  } catch (err) {
    console.error("Monthly close error:", err);
    return NextResponse.json({ error: "Failed to update monthly closure." }, { status: 500 });
  }
}
