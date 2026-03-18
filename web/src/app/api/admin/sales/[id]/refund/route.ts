// src/app/api/admin/sales/[id]/refund/route.ts
// Process refund for a sale

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
    const { amount, reason } = body;

    if (amount == null || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "返金額が不正です" }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: "返金理由は必須です" }, { status: 400 });
    }

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "売上が見つかりません" }, { status: 404 });
    }
    if (["CANCELLED", "REFUNDED"].includes(existing.paymentStatus)) {
      return NextResponse.json({ error: "この売上は既に返金または取消済みです" }, { status: 400 });
    }

    const isFullRefund = amount >= existing.totalAmount;
    const newStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        paymentStatus: newStatus,
        refundAmount: amount,
        refundedAt: new Date(),
      },
    });

    await prisma.saleAuditLog.create({
      data: {
        saleId: id,
        action: "REFUND",
        changedField: "refundAmount",
        oldValue: "0",
        newValue: String(amount),
        reason: reason.trim(),
        actedBy: user?.id ?? null,
      },
    });

    return NextResponse.json(sale);
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: "返金処理に失敗しました" }, { status: 500 });
  }
}
