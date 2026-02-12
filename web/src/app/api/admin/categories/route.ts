// src/app/api/admin/categories/route.ts
// Admin Categories API - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: { select: { menus: true } },
      },
    });

    const result = categories.map((cat) => ({
      ...cat,
      menuCount: cat._count.menus,
      _count: undefined,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin categories error:", err);
    return NextResponse.json({ error: "カテゴリの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, nameEn, color, displayOrder, isActive } = body;

    if (!name || !nameEn || !color) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "同じ名前のカテゴリが既に存在します" }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        nameEn,
        color,
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("Create category error:", err);
    return NextResponse.json({ error: "カテゴリの作成に失敗しました" }, { status: 500 });
  }
}
