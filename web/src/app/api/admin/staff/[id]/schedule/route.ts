// src/app/api/admin/staff/[id]/schedule/route.ts
// Admin Staff Schedule API

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT /api/admin/staff/:id/schedule - 週間スケジュール一括更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { schedules } = body as {
      schedules: { dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean }[];
    };

    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { error: "schedules は配列で指定してください" },
        { status: 400 }
      );
    }

    // スタッフ存在確認
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      return NextResponse.json(
        { error: "スタッフが見つかりません" },
        { status: 404 }
      );
    }

    // transaction で一括更新
    await prisma.$transaction(async (tx) => {
      // 既存スケジュールを削除
      await tx.staffSchedule.deleteMany({ where: { staffId: id } });

      // 新しいスケジュールを作成
      if (schedules.length > 0) {
        await tx.staffSchedule.createMany({
          data: schedules.map((s) => ({
            staffId: id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isActive: s.isActive ?? true,
          })),
        });
      }
    });

    // 更新後のスケジュールを返す
    const updated = await prisma.staffSchedule.findMany({
      where: { staffId: id },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Admin staff schedule error:", err);
    return NextResponse.json(
      { error: "スケジュールの更新に失敗しました" },
      { status: 500 }
    );
  }
}
