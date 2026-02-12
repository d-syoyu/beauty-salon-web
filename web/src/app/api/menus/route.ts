// src/app/api/menus/route.ts
// LUMINA HAIR STUDIO - Public Menu API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/menus - Return active menus with categories, sorted by displayOrder
export async function GET() {
  try {
    const menus = await prisma.menu.findMany({
      where: { isActive: true, duration: { gt: 0 } },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            color: true,
            displayOrder: true,
          },
        },
      },
      orderBy: [
        { category: { displayOrder: "asc" } },
        { displayOrder: "asc" },
      ],
    });

    // Only return categories that have bookable menus
    const categoryIds = [...new Set(menus.map((m) => m.category.id))];
    const categories = await prisma.category.findMany({
      where: { isActive: true, id: { in: categoryIds } },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        nameEn: true,
        color: true,
        displayOrder: true,
      },
    });

    return NextResponse.json({ menus, categories });
  } catch (error) {
    console.error("Get menus error:", error);
    return NextResponse.json(
      { error: "メニューの取得に失敗しました" },
      { status: 500 }
    );
  }
}
