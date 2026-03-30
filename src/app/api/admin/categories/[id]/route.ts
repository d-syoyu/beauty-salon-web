// src/app/api/admin/categories/[id]/route.ts
// Admin Category Detail - Update & Delete

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "カテゴリが見つかりません" }, { status: 404 });
    }

    if (body.name && body.name !== existing.name) {
      const duplicate = await prisma.category.findUnique({ where: { name: body.name } });
      if (duplicate) {
        return NextResponse.json({ error: "同じ名前のカテゴリが既に存在します" }, { status: 409 });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(category);
  } catch (err) {
    console.error("Update category error:", err);
    return NextResponse.json({ error: "カテゴリの更新に失敗しました" }, { status: 500 });
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

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { menus: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "カテゴリが見つかりません" }, { status: 404 });
    }

    if (existing._count.menus > 0) {
      return NextResponse.json(
        { error: "メニューが紐付いているカテゴリは削除できません" },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete category error:", err);
    return NextResponse.json({ error: "カテゴリの削除に失敗しました" }, { status: 500 });
  }
}
