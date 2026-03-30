// src/app/api/admin/sales/[id]/cancel/route.ts
// Cancel a sale (soft cancel, keeps record)

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason?.trim()) {
      return NextResponse.json({ error: "取消理由は必須です" }, { status: 400 });
    }

    const existing = await prisma.sale.findUnique({
      where: { id },
      select: { id: true, paymentStatus: true, reservationId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "売上が見つかりません" }, { status: 404 });
    }
    if (existing.paymentStatus === "CANCELLED") {
      return NextResponse.json({ error: "この売上は既に取消済みです" }, { status: 400 });
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        paymentStatus: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason.trim(),
      },
    });

    await prisma.saleAuditLog.create({
      data: {
        saleId: id,
        action: "CANCEL",
        reason: reason.trim(),
        actedBy: user?.id ?? null,
      },
    });

    // Optionally revert linked reservation to CONFIRMED
    if (existing.reservationId) {
      await prisma.reservation.update({
        where: { id: existing.reservationId },
        data: { status: "CANCELLED" },
      });
    }

    return NextResponse.json(sale);
  } catch (err) {
    console.error("Cancel sale error:", err);
    return NextResponse.json({ error: "売上の取消に失敗しました" }, { status: 500 });
  }
}
