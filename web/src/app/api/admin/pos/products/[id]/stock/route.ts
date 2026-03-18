// src/app/api/admin/pos/products/[id]/stock/route.ts
// Manual stock adjustment

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { adjustment } = body;

    if (adjustment == null || typeof adjustment !== "number") {
      return NextResponse.json({ error: "adjustmentが必要です" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { stockQuantity: { increment: adjustment } },
    });

    return NextResponse.json(product);
  } catch (err: unknown) {
    console.error("Stock adjustment error:", err);
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ error: "在庫調整に失敗しました" }, { status: 500 });
  }
}
