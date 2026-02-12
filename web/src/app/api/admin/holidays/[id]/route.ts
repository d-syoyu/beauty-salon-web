// src/app/api/admin/holidays/[id]/route.ts
// Admin Holiday Detail - Delete

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "休日が見つかりません" }, { status: 404 });
    }

    await prisma.holiday.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete holiday error:", err);
    return NextResponse.json({ error: "休日の削除に失敗しました" }, { status: 500 });
  }
}
