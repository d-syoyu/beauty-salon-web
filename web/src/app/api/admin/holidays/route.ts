// src/app/api/admin/holidays/route.ts
// Admin Holidays API - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDate, formatLocalDate } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Format dates using local timezone to avoid UTC date shift
    const result = holidays.map((h) => ({
      ...h,
      date: formatLocalDate(new Date(h.date)),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin holidays error:", err);
    return NextResponse.json({ error: "休日の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { date, startTime, endTime, reason } = body;

    if (!date) {
      return NextResponse.json({ error: "日付を指定してください" }, { status: 400 });
    }

    // Use noon local time to prevent UTC date shift
    const parsedDate = parseLocalDate(date);

    // Check for existing reservations that would conflict with this holiday
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingReservations = await prisma.reservation.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      select: { id: true, startTime: true, endTime: true, staffName: true },
    });

    if (existingReservations.length > 0) {
      const conflicting =
        startTime && endTime
          ? existingReservations.filter(
              (r) => r.startTime < endTime && r.endTime > startTime
            )
          : existingReservations;

      if (conflicting.length > 0) {
        return NextResponse.json(
          {
            error: `この日には${conflicting.length}件の予約があります。休業日を設定する前に予約をキャンセルしてください。`,
            reservations: conflicting,
          },
          { status: 409 }
        );
      }
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: parsedDate,
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null,
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (err) {
    console.error("Create holiday error:", err);
    return NextResponse.json({ error: "休日の登録に失敗しました" }, { status: 500 });
  }
}
