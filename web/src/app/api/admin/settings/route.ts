// src/app/api/admin/settings/route.ts
// Admin Settings API - Get & Update

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const settings = await prisma.settings.findMany();

    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    // Parse closedDays
    const closedDays = result.closed_days ? JSON.parse(result.closed_days) : [1];
    const taxRate = result.tax_rate ? parseInt(result.tax_rate) : 10;

    return NextResponse.json({ closedDays, taxRate, raw: result });
  } catch (err) {
    console.error("Admin settings error:", err);
    return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();

    if (body.closedDays !== undefined) {
      await prisma.settings.upsert({
        where: { key: "closed_days" },
        update: { value: JSON.stringify(body.closedDays) },
        create: { key: "closed_days", value: JSON.stringify(body.closedDays) },
      });
    }

    if (body.taxRate !== undefined) {
      await prisma.settings.upsert({
        where: { key: "tax_rate" },
        update: { value: String(body.taxRate) },
        create: { key: "tax_rate", value: String(body.taxRate) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update settings error:", err);
    return NextResponse.json({ error: "設定の更新に失敗しました" }, { status: 500 });
  }
}
