// src/app/api/admin/menus/[id]/route.ts
// Admin Menu Detail - Update & Delete

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

    const existing = await prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "メニューが見つかりません" }, { status: 404 });
    }

    if (body.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!category) {
        return NextResponse.json({ error: "カテゴリが見つかりません" }, { status: 404 });
      }
    }

    const menu = await prisma.menu.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.priceVariable !== undefined && { priceVariable: body.priceVariable }),
        ...(body.duration !== undefined && { duration: Number(body.duration) }),
        ...(body.lastBookingTime !== undefined && { lastBookingTime: body.lastBookingTime }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        category: {
          select: { id: true, name: true, nameEn: true, color: true },
        },
      },
    });

    return NextResponse.json(menu);
  } catch (err) {
    console.error("Update menu error:", err);
    return NextResponse.json({ error: "メニューの更新に失敗しました" }, { status: 500 });
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

    const existing = await prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "メニューが見つかりません" }, { status: 404 });
    }

    await prisma.menu.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete menu error:", err);
    return NextResponse.json({ error: "メニューの削除に失敗しました" }, { status: 500 });
  }
}
