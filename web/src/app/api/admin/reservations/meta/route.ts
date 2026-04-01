import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const [staff, categories, menus] = await Promise.all([
      prisma.staff.findMany({
        where: { isActive: true },
        select: { id: true, name: true, image: true },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.category.findMany({
        select: { name: true, color: true },
      }),
      prisma.menu.findMany({
        select: {
          id: true,
          category: {
            select: { color: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      staffList: staff,
      categoryColors: Object.fromEntries(categories.map((category) => [category.name, category.color])),
      menuCategoryColors: Object.fromEntries(menus.map((menu) => [menu.id, menu.category.color])),
    });
  } catch (err) {
    console.error("Reservation metadata error:", err);
    return NextResponse.json(
      { error: "Failed to load reservation metadata." },
      { status: 500 }
    );
  }
}
