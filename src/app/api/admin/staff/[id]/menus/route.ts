// src/app/api/admin/staff/[id]/menus/route.ts
// Admin Staff Menu Assignments API

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT /api/admin/staff/:id/menus - メニュー割り当て一括更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { menuIds } = body as { menuIds: string[] };

    if (!Array.isArray(menuIds)) {
      return NextResponse.json(
        { error: "menuIds は配列で指定してください" },
        { status: 400 }
      );
    }

    // スタッフ存在確認
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      return NextResponse.json(
        { error: "スタッフが見つかりません" },
        { status: 404 }
      );
    }

    // transaction で一括更新
    await prisma.$transaction(async (tx) => {
      await tx.staffMenu.deleteMany({ where: { staffId: id } });

      if (menuIds.length > 0) {
        await tx.staffMenu.createMany({
          data: menuIds.map((menuId) => ({
            staffId: id,
            menuId,
          })),
        });
      }
    });

    const updated = await prisma.staffMenu.findMany({
      where: { staffId: id },
      include: {
        menu: { select: { id: true, name: true, categoryId: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Admin staff menus error:", err);
    return NextResponse.json(
      { error: "メニュー割り当ての更新に失敗しました" },
      { status: 500 }
    );
  }
}
