// src/app/api/admin/special-open-days/route.ts
// Admin Special Open Days API - List & Create

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

    const specialOpenDays = await prisma.specialOpenDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Format dates using local timezone to avoid UTC date shift
    const result = specialOpenDays.map((s) => ({
      ...s,
      date: formatLocalDate(new Date(s.date)),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin special open days error:", err);
    return NextResponse.json({ error: "臨時営業日の取得に失敗しました" }, { status: 500 });
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

    // 既存チェック
    const existing = await prisma.specialOpenDay.findFirst({
      where: {
        date: parsedDate,
        startTime: startTime || null,
        endTime: endTime || null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "この日付・時間帯は既に臨時営業日として登録されています" },
        { status: 409 }
      );
    }

    const specialOpenDay = await prisma.specialOpenDay.create({
      data: {
        date: parsedDate,
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null,
      },
    });

    return NextResponse.json(specialOpenDay, { status: 201 });
  } catch (err) {
    console.error("Create special open day error:", err);
    return NextResponse.json({ error: "臨時営業日の登録に失敗しました" }, { status: 500 });
  }
}
