// Schedule Overview API - Returns all staff with schedules & overrides for a month

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      include: {
        schedules: { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } },
        scheduleOverrides: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ staff, year, month });
  } catch (err) {
    console.error("Schedule overview error:", err);
    return NextResponse.json({ error: "スケジュールの取得に失敗しました" }, { status: 500 });
  }
}
