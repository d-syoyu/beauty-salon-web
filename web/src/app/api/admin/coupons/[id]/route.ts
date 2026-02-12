// src/app/api/admin/coupons/[id]/route.ts
// Admin Coupon Detail - Update & Delete

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "クーポンが見つかりません" }, { status: 404 });
    }

    if (body.code && body.code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.coupon.findUnique({ where: { code: body.code.toUpperCase() } });
      if (duplicate) {
        return NextResponse.json({ error: "同じコードのクーポンが既に存在します" }, { status: 409 });
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(body.code !== undefined && { code: body.code.toUpperCase() }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.value !== undefined && { value: Number(body.value) }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.applicableMenuIds !== undefined && { applicableMenuIds: JSON.stringify(body.applicableMenuIds) }),
        ...(body.applicableCategoryIds !== undefined && { applicableCategoryIds: JSON.stringify(body.applicableCategoryIds) }),
        ...(body.applicableWeekdays !== undefined && { applicableWeekdays: JSON.stringify(body.applicableWeekdays) }),
        ...(body.startTime !== undefined && { startTime: body.startTime || null }),
        ...(body.endTime !== undefined && { endTime: body.endTime || null }),
        ...(body.onlyFirstTime !== undefined && { onlyFirstTime: body.onlyFirstTime }),
        ...(body.onlyReturning !== undefined && { onlyReturning: body.onlyReturning }),
        ...(body.validFrom !== undefined && { validFrom: new Date(body.validFrom) }),
        ...(body.validUntil !== undefined && { validUntil: new Date(body.validUntil) }),
        ...(body.usageLimit !== undefined && { usageLimit: body.usageLimit !== null ? Number(body.usageLimit) : null }),
        ...(body.usageLimitPerCustomer !== undefined && { usageLimitPerCustomer: body.usageLimitPerCustomer !== null ? Number(body.usageLimitPerCustomer) : null }),
        ...(body.minimumAmount !== undefined && { minimumAmount: body.minimumAmount !== null ? Number(body.minimumAmount) : null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(coupon);
  } catch (err) {
    console.error("Update coupon error:", err);
    return NextResponse.json({ error: "クーポンの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "クーポンが見つかりません" }, { status: 404 });
    }

    await prisma.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete coupon error:", err);
    return NextResponse.json({ error: "クーポンの削除に失敗しました" }, { status: 500 });
  }
}
