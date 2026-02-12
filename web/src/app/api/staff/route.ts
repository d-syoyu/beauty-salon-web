// src/app/api/staff/route.ts
// 公開スタッフAPI

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/staff?menuIds=id1,id2
export async function GET(request: NextRequest) {
  try {
    const menuIdsParam = request.nextUrl.searchParams.get("menuIds");

    const staffList = await prisma.staff.findMany({
      where: { isActive: true },
      include: {
        schedules: { where: { isActive: true } },
        menuAssignments: { select: { menuId: true } },
      },
      orderBy: { displayOrder: "asc" },
    });

    let filtered = staffList;

    // menuIds 指定時は対応可能なスタッフのみにフィルタ
    if (menuIdsParam) {
      const menuIds = menuIdsParam.split(",").filter(Boolean);
      filtered = staffList.filter((staff) => {
        if (staff.menuAssignments.length === 0) return true;
        const assignedIds = new Set(
          staff.menuAssignments.map((a) => a.menuId)
        );
        return menuIds.every((id) => assignedIds.has(id));
      });
    }

    return NextResponse.json({ staff: filtered });
  } catch (error) {
    console.error("Staff API error:", error);
    return NextResponse.json(
      { error: "スタッフ情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
