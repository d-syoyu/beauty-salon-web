// src/app/api/admin/staff/[id]/route.ts
// Admin Staff Detail API

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/admin/staff/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        schedules: { orderBy: { dayOfWeek: "asc" } },
        scheduleOverrides: { orderBy: { date: "asc" } },
        menuAssignments: {
          include: {
            menu: {
              select: { id: true, name: true, categoryId: true },
            },
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "スタッフが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(staff);
  } catch (err) {
    console.error("Admin staff detail error:", err);
    return NextResponse.json(
      { error: "スタッフ情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/staff/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const staff = await prisma.staff.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.image !== undefined && { image: body.image }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.specialties !== undefined && { specialties: body.specialties }),
        ...(body.experience !== undefined && { experience: body.experience }),
        ...(body.socialMedia !== undefined && { socialMedia: body.socialMedia }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(staff);
  } catch (err) {
    console.error("Admin staff update error:", err);
    return NextResponse.json(
      { error: "スタッフの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/staff/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ message: "スタッフを削除しました" });
  } catch (err) {
    console.error("Admin staff delete error:", err);
    return NextResponse.json(
      { error: "スタッフの削除に失敗しました" },
      { status: 500 }
    );
  }
}
