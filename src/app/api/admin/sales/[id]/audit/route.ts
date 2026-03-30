// src/app/api/admin/sales/[id]/audit/route.ts
// Get audit log for a sale

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

    const logs = await prisma.saleAuditLog.findMany({
      where: { saleId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error("Audit log error:", err);
    return NextResponse.json({ error: "監査ログの取得に失敗しました" }, { status: 500 });
  }
}
