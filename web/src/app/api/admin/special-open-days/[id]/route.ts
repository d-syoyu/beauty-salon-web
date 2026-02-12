// src/app/api/admin/special-open-days/[id]/route.ts
// Admin Special Open Day Delete API

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.specialOpenDay.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "臨時営業日が見つかりません" }, { status: 404 });
    }

    await prisma.specialOpenDay.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete special open day error:", err);
    return NextResponse.json({ error: "臨時営業日の削除に失敗しました" }, { status: 500 });
  }
}
