// src/app/api/admin/reservations/[id]/route.ts
// Admin Reservation Detail - Update status

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;

    const validStatuses = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
    }

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (note !== undefined) updateData.note = note;

    const reservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json(reservation);
  } catch (err) {
    console.error("Update reservation error:", err);
    return NextResponse.json({ error: "予約の更新に失敗しました" }, { status: 500 });
  }
}
