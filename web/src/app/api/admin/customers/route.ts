// src/app/api/admin/customers/route.ts
// Admin Customers API - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      role: "CUSTOMER",
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          newsletterOptOut: true,
          _count: {
            select: { reservations: true },
          },
          reservations: {
            orderBy: [{ date: "desc" }, { startTime: "desc" }],
            take: 20,
            include: {
              items: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const result = customers.map((c) => ({
      ...c,
      _count: {
        reservations: c._count.reservations,
        completedReservations: c.reservations.filter(
          (r) => r.status === "COMPLETED"
        ).length,
      },
    }));

    return NextResponse.json({
      customers: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Admin customers error:", err);
    return NextResponse.json({ error: "顧客の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, phone, email } = body;

    if (!name && !phone && !email) {
      return NextResponse.json({ error: "名前、電話番号、またはメールアドレスのいずれかを入力してください" }, { status: 400 });
    }

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
      }
    }

    const customer = await prisma.user.create({
      data: {
        name: name || null,
        phone: phone || null,
        email: email || null,
        role: "CUSTOMER",
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error("Create customer error:", err);
    return NextResponse.json({ error: "顧客の登録に失敗しました" }, { status: 500 });
  }
}
