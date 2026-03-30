// src/app/api/admin/menus/route.ts
// Admin Menus API - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

    const where = includeInactive ? {} : { isActive: true };

    const menus = await prisma.menu.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, nameEn: true, color: true },
        },
      },
      orderBy: [
        { category: { displayOrder: "asc" } },
        { displayOrder: "asc" },
      ],
    });

    return NextResponse.json(menus);
  } catch (err) {
    console.error("Admin menus error:", err);
    return NextResponse.json({ error: "メニューの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, categoryId, price, priceVariable, duration, lastBookingTime, displayOrder, isActive } = body;

    if (!name || !categoryId || price === undefined || !duration || !lastBookingTime) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "カテゴリが見つかりません" }, { status: 404 });
    }

    const menu = await prisma.menu.create({
      data: {
        name,
        categoryId,
        price: Number(price),
        priceVariable: priceVariable || false,
        duration: Number(duration),
        lastBookingTime,
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
      },
      include: {
        category: {
          select: { id: true, name: true, nameEn: true, color: true },
        },
      },
    });

    return NextResponse.json(menu, { status: 201 });
  } catch (err) {
    console.error("Create menu error:", err);
    return NextResponse.json({ error: "メニューの作成に失敗しました" }, { status: 500 });
  }
}
