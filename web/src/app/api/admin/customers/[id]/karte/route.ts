// src/app/api/admin/customers/[id]/karte/route.ts
// Customer Karte (Treatment Records) - List & Create

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
    const { id: userId } = await params;

    const kartes = await prisma.customerKarte.findMany({
      where: { userId },
      orderBy: { visitDate: "desc" },
      include: {
        sale: { select: { saleNumber: true } },
      },
    });

    return NextResponse.json(kartes);
  } catch (err) {
    console.error("Get karte error:", err);
    return NextResponse.json({ error: "カルテの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id: userId } = await params;
    const body = await request.json();
    const {
      staffId,
      staffName,
      visitDate,
      treatmentNote,
      chemicalFormula,
      hairCondition,
      photos,
      nextVisitNote,
      ngNotes,
      saleId,
    } = body;

    if (!visitDate) {
      return NextResponse.json({ error: "来店日は必須です" }, { status: 400 });
    }

    const karte = await prisma.customerKarte.create({
      data: {
        userId,
        staffId: staffId || null,
        staffName: staffName || null,
        visitDate: new Date(visitDate),
        treatmentNote: treatmentNote || null,
        chemicalFormula: chemicalFormula || null,
        hairCondition: hairCondition || null,
        photos: photos ? JSON.stringify(photos) : "[]",
        nextVisitNote: nextVisitNote || null,
        ngNotes: ngNotes || null,
        saleId: saleId || null,
      },
      include: {
        sale: { select: { saleNumber: true } },
      },
    });

    return NextResponse.json(karte, { status: 201 });
  } catch (err: unknown) {
    console.error("Create karte error:", err);
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "この売上に紐付いたカルテは既に存在します" }, { status: 409 });
    }
    return NextResponse.json({ error: "カルテの作成に失敗しました" }, { status: 500 });
  }
}
