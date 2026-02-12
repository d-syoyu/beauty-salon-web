// Staff Schedule Override API - Create/Update/Delete date-specific shift overrides

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDate } from "@/lib/date-utils";

// PUT - Upsert override for a specific date
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { date, startTime, endTime } = body;

    if (!date) {
      return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
    }

    const parsedDate = parseLocalDate(date);

    const override = await prisma.staffScheduleOverride.upsert({
      where: { staffId_date: { staffId: id, date: parsedDate } },
      update: { startTime: startTime ?? null, endTime: endTime ?? null },
      create: { staffId: id, date: parsedDate, startTime: startTime ?? null, endTime: endTime ?? null },
    });

    return NextResponse.json(override);
  } catch (err) {
    console.error("Schedule override upsert error:", err);
    return NextResponse.json({ error: "シフトの更新に失敗しました" }, { status: 500 });
  }
}

// DELETE - Remove override (revert to weekly schedule)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const dateStr = request.nextUrl.searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
    }

    const parsedDate = parseLocalDate(dateStr);
    await prisma.staffScheduleOverride.deleteMany({
      where: { staffId: id, date: parsedDate },
    });

    return NextResponse.json({ message: "シフトを通常に戻しました" });
  } catch (err) {
    console.error("Schedule override delete error:", err);
    return NextResponse.json({ error: "シフトの削除に失敗しました" }, { status: 500 });
  }
}
