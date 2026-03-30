// src/app/api/admin/customers/[id]/karte/[karteId]/route.ts
// Customer Karte - Get, Update, Delete single record

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; karteId: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id: userId, karteId } = await params;

    const karte = await prisma.customerKarte.findFirst({
      where: { id: karteId, userId },
      include: { sale: { select: { saleNumber: true } } },
    });

    if (!karte) {
      return NextResponse.json({ error: "カルテが見つかりません" }, { status: 404 });
    }

    return NextResponse.json(karte);
  } catch (err) {
    console.error("Get karte error:", err);
    return NextResponse.json({ error: "カルテの取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; karteId: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id: userId, karteId } = await params;
    const body = await request.json();

    const existing = await prisma.customerKarte.findFirst({ where: { id: karteId, userId } });
    if (!existing) {
      return NextResponse.json({ error: "カルテが見つかりません" }, { status: 404 });
    }

    const karte = await prisma.customerKarte.update({
      where: { id: karteId },
      data: {
        ...(body.staffId !== undefined && { staffId: body.staffId || null }),
        ...(body.staffName !== undefined && { staffName: body.staffName || null }),
        ...(body.visitDate != null && { visitDate: new Date(body.visitDate) }),
        ...(body.treatmentNote !== undefined && { treatmentNote: body.treatmentNote || null }),
        ...(body.chemicalFormula !== undefined && { chemicalFormula: body.chemicalFormula || null }),
        ...(body.hairCondition !== undefined && { hairCondition: body.hairCondition || null }),
        ...(body.photos !== undefined && { photos: JSON.stringify(body.photos) }),
        ...(body.nextVisitNote !== undefined && { nextVisitNote: body.nextVisitNote || null }),
        ...(body.ngNotes !== undefined && { ngNotes: body.ngNotes || null }),
        ...(body.saleId !== undefined && { saleId: body.saleId || null }),
      },
      include: { sale: { select: { saleNumber: true } } },
    });

    return NextResponse.json(karte);
  } catch (err) {
    console.error("Update karte error:", err);
    return NextResponse.json({ error: "カルテの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; karteId: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id: userId, karteId } = await params;

    const existing = await prisma.customerKarte.findFirst({ where: { id: karteId, userId } });
    if (!existing) {
      return NextResponse.json({ error: "カルテが見つかりません" }, { status: 404 });
    }

    await prisma.customerKarte.delete({ where: { id: karteId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete karte error:", err);
    return NextResponse.json({ error: "カルテの削除に失敗しました" }, { status: 500 });
  }
}
