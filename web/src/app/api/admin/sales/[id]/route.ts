// src/app/api/admin/sales/[id]/route.ts
// Admin Sale Detail - Get, Update, Delete

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { orderBy: { orderIndex: "asc" } },
        user: { select: { name: true, phone: true, email: true } },
        coupon: { select: { code: true, name: true, type: true, value: true } },
        payments: { orderBy: { orderIndex: "asc" } },
        reservation: {
          select: { id: true, date: true, startTime: true, endTime: true, menuSummary: true },
        },
        staff: { select: { id: true, name: true } },
        createdByUser: { select: { name: true } },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "売上が見つかりません" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (err) {
    console.error("Sale detail error:", err);
    return NextResponse.json({ error: "売上の取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "売上が見つかりません" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const auditEntries: Array<{ changedField: string; oldValue: string; newValue: string }> = [];

    const trackField = (
      field: keyof typeof existing,
      newVal: string | null | undefined
    ) => {
      if (newVal !== undefined && String(newVal) !== String(existing[field] ?? "")) {
        updateData[field] = newVal;
        auditEntries.push({
          changedField: field,
          oldValue: String(existing[field] ?? ""),
          newValue: String(newVal ?? ""),
        });
      }
    };

    trackField("paymentMethod", body.paymentMethod);
    trackField("paymentStatus", body.paymentStatus);
    trackField("note", body.note);
    trackField("customerName", body.customerName);

    const sale = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { orderIndex: "asc" } },
        user: { select: { name: true } },
      },
    });

    // Write audit log (best-effort — does not roll back the update)
    if (auditEntries.length > 0) {
      await prisma.saleAuditLog.createMany({
        data: auditEntries.map((e) => ({
          saleId: id,
          action: "UPDATE",
          changedField: e.changedField,
          oldValue: e.oldValue,
          newValue: e.newValue,
          actedBy: user?.id ?? null,
        })),
      });
    }

    return NextResponse.json(sale);
  } catch (err) {
    console.error("Update sale error:", err);
    return NextResponse.json({ error: "売上の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "売上が見つかりません" }, { status: 404 });
    }

    // Log before deletion (cascade will remove the log too, but that's acceptable for hard-deletes)
    await prisma.saleAuditLog.create({
      data: {
        saleId: id,
        action: "DELETE",
        actedBy: user?.id ?? null,
      },
    });

    await prisma.sale.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete sale error:", err);
    return NextResponse.json({ error: "売上の削除に失敗しました" }, { status: 500 });
  }
}
