// src/app/api/admin/reservations/route.ts
// Admin Reservations API - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDate, parseLocalDateStart, parseLocalDateEnd } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get("date");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (dateStr) {
      where.date = {
        gte: parseLocalDateStart(dateStr),
        lte: parseLocalDateEnd(dateStr),
      };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      };
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            orderBy: { orderIndex: "asc" },
          },
          coupon: {
            select: { id: true, code: true, name: true, type: true, value: true },
          },
        },
        orderBy: [{ date: "desc" }, { startTime: "asc" }],
        skip,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    return NextResponse.json({
      reservations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Admin reservations error:", err);
    return NextResponse.json({ error: "予約の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { userId, date, startTime, menuIds, note } = body;

    if (!userId || !date || !startTime || !menuIds?.length) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds }, isActive: true },
      include: { category: true },
    });

    if (menus.length !== menuIds.length) {
      return NextResponse.json({ error: "無効なメニューが含まれています" }, { status: 400 });
    }

    const totalDuration = menus.reduce((sum, m) => sum + m.duration, 0);
    const totalPrice = menus.reduce((sum, m) => sum + m.price, 0);

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const endMinutes = startHours * 60 + startMinutes + totalDuration;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

    const menuSummary = menus.map((m) => m.name).join(" + ");

    // Use noon local time to prevent UTC date shift
    const parsedDate = parseLocalDate(date);

    const reservation = await prisma.reservation.create({
      data: {
        userId,
        date: parsedDate,
        startTime,
        endTime,
        totalPrice,
        totalDuration,
        menuSummary,
        status: "CONFIRMED",
        note: note || null,
        items: {
          create: menus.map((menu, idx) => ({
            menuId: menu.id,
            menuName: menu.name,
            category: menu.category.name,
            price: menu.price,
            duration: menu.duration,
            orderIndex: idx,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    console.error("Create reservation error:", err);
    return NextResponse.json({ error: "予約の作成に失敗しました" }, { status: 500 });
  }
}
