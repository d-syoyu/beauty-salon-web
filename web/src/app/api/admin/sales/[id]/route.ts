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
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "売上が見つかりません" }, { status: 404 });
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod }),
        ...(body.paymentStatus !== undefined && { paymentStatus: body.paymentStatus }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.customerName !== undefined && { customerName: body.customerName }),
      },
      include: {
        items: { orderBy: { orderIndex: "asc" } },
        user: { select: { name: true } },
      },
    });

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
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "売上が見つかりません" }, { status: 404 });
    }

    await prisma.sale.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete sale error:", err);
    return NextResponse.json({ error: "売上の削除に失敗しました" }, { status: 500 });
  }
}
