// src/app/api/admin/coupons/route.ts
// Admin Coupons API - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { usages: true, sales: true },
        },
      },
    });

    return NextResponse.json(coupons);
  } catch (err) {
    console.error("Admin coupons error:", err);
    return NextResponse.json({ error: "クーポンの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const {
      code,
      name,
      type,
      value,
      description,
      applicableMenuIds,
      applicableCategoryIds,
      applicableWeekdays,
      startTime,
      endTime,
      onlyFirstTime,
      onlyReturning,
      validFrom,
      validUntil,
      usageLimit,
      usageLimitPerCustomer,
      minimumAmount,
      isActive,
    } = body;

    if (!code || !name || !type || value === undefined || !validFrom || !validUntil) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: "同じコードのクーポンが既に存在します" }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        name,
        type,
        value: Number(value),
        description: description || null,
        applicableMenuIds: JSON.stringify(applicableMenuIds || []),
        applicableCategoryIds: JSON.stringify(applicableCategoryIds || []),
        applicableWeekdays: JSON.stringify(applicableWeekdays || []),
        startTime: startTime || null,
        endTime: endTime || null,
        onlyFirstTime: onlyFirstTime || false,
        onlyReturning: onlyReturning || false,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        usageLimit: usageLimit !== undefined ? Number(usageLimit) : null,
        usageLimitPerCustomer: usageLimitPerCustomer !== undefined ? Number(usageLimitPerCustomer) : null,
        minimumAmount: minimumAmount !== undefined ? Number(minimumAmount) : null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    console.error("Create coupon error:", err);
    return NextResponse.json({ error: "クーポンの作成に失敗しました" }, { status: 500 });
  }
}
