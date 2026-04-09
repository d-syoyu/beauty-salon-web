// src/app/api/admin/settings/route.ts
// Admin Settings API - Get & Update

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const settings = await prisma.settings.findMany();

    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    // Parse closedDays
    const closedDays = result.closed_days ? JSON.parse(result.closed_days) : [1];
    const taxRate = result.tax_rate ? parseInt(result.tax_rate) : 10;
    const cancellationHoursBefore = result.cancellation_hours_before
      ? parseInt(result.cancellation_hours_before)
      : 24;

    return NextResponse.json({ closedDays, taxRate, cancellationHoursBefore, raw: result });
  } catch (err) {
    console.error("Admin settings error:", err);
    return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();

    if (body.closedDays !== undefined) {
      // Check if any new days are being added to closed days
      const currentSetting = await prisma.settings.findUnique({ where: { key: "closed_days" } });
      const currentClosed: number[] = currentSetting ? JSON.parse(currentSetting.value) : [1];
      const newlyClosed: number[] = (body.closedDays as number[]).filter(
        (d) => !currentClosed.includes(d)
      );

      if (newlyClosed.length > 0) {
        // Check for reservations in the next 60 days that fall on newly closed weekdays
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const future = new Date(today);
        future.setDate(future.getDate() + 60);
        future.setHours(23, 59, 59, 999);

        const upcomingReservations = await prisma.reservation.findMany({
          where: {
            date: { gte: today, lte: future },
            status: { in: ["CONFIRMED", "PENDING"] },
          },
          select: { date: true, id: true },
        });

        const conflicting = upcomingReservations.filter((r) =>
          newlyClosed.includes(new Date(r.date).getDay())
        );

        if (conflicting.length > 0) {
          return NextResponse.json(
            {
              error: `新しい定休日の設定により、今後60日以内の${conflicting.length}件の予約と競合します。該当する予約をキャンセル後に定休日を変更してください。`,
              count: conflicting.length,
            },
            { status: 409 }
          );
        }
      }

      await prisma.settings.upsert({
        where: { key: "closed_days" },
        update: { value: JSON.stringify(body.closedDays) },
        create: { key: "closed_days", value: JSON.stringify(body.closedDays) },
      });
    }

    if (body.taxRate !== undefined) {
      await prisma.settings.upsert({
        where: { key: "tax_rate" },
        update: { value: String(body.taxRate) },
        create: { key: "tax_rate", value: String(body.taxRate) },
      });
    }

    if (body.cancellationHoursBefore !== undefined) {
      await prisma.settings.upsert({
        where: { key: "cancellation_hours_before" },
        update: { value: String(body.cancellationHoursBefore) },
        create: { key: "cancellation_hours_before", value: String(body.cancellationHoursBefore) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update settings error:", err);
    return NextResponse.json({ error: "設定の更新に失敗しました" }, { status: 500 });
  }
}
