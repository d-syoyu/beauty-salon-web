// src/app/api/holidays/route.ts
// LUMINA HAIR STUDIO - Public Holiday API (for booking page)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatLocalDate } from "@/lib/date-utils";

// GET /api/holidays?year=2026&month=2 - Public holidays and closed days
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year) {
      return NextResponse.json(
        { error: "年を指定してください" },
        { status: 400 }
      );
    }

    let where = {};

    if (month) {
      // Specific month
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      endDate.setHours(23, 59, 59, 999);

      where = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    } else {
      // Full year
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      endDate.setHours(23, 59, 59, 999);

      where = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    // Fetch irregular holidays
    const holidays = await prisma.holiday.findMany({
      where,
      select: {
        date: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
      orderBy: { date: "asc" },
    });

    // Fetch closed days setting from DB
    const closedDaysSetting = await prisma.settings.findUnique({
      where: { key: "closed_days" },
    });
    const closedDays: number[] = closedDaysSetting
      ? JSON.parse(closedDaysSetting.value)
      : [1]; // Default: Monday

    // Fetch special open days (override closed days)
    const specialOpenDays = await prisma.specialOpenDay.findMany({
      where,
      select: {
        date: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
      orderBy: { date: "asc" },
    });

    // Format dates using local timezone to avoid UTC date shift
    const holidayResult = holidays.map((h) => ({
      date: formatLocalDate(new Date(h.date)),
      startTime: h.startTime,
      endTime: h.endTime,
      reason: h.reason,
    }));

    const specialOpenDayResult = specialOpenDays.map((s) => ({
      date: formatLocalDate(new Date(s.date)),
      startTime: s.startTime,
      endTime: s.endTime,
      reason: s.reason,
    }));

    return NextResponse.json({
      holidays: holidayResult,
      closedDays,
      specialOpenDays: specialOpenDayResult,
    });
  } catch (error) {
    console.error("Get holidays error:", error);
    return NextResponse.json(
      { error: "休業日の取得に失敗しました" },
      { status: 500 }
    );
  }
}
