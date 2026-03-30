// src/app/api/admin/staff/route.ts
// Admin Staff API - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/admin/staff - 全スタッフ一覧
export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const staff = await prisma.staff.findMany({
      include: {
        schedules: { orderBy: { dayOfWeek: "asc" } },
        menuAssignments: {
          include: {
            menu: { select: { id: true, name: true, categoryId: true } },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(staff);
  } catch (err) {
    console.error("Admin staff list error:", err);
    return NextResponse.json(
      { error: "スタッフ一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/admin/staff - スタッフ新規作成
export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, nameEn, role, image, bio, specialties, experience, socialMedia, displayOrder, isActive } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "名前と役職は必須です" },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.create({
      data: {
        name,
        nameEn: nameEn || null,
        role,
        image: image || null,
        bio: bio || null,
        specialties: specialties || "[]",
        experience: experience || null,
        socialMedia: socialMedia || "{}",
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (err) {
    console.error("Admin staff create error:", err);
    return NextResponse.json(
      { error: "スタッフの作成に失敗しました" },
      { status: 500 }
    );
  }
}
