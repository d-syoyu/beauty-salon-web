// src/app/api/admin/payment-methods/route.ts
// Admin Payment Methods API

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const methods = await prisma.paymentMethodSetting.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(methods);
  } catch (err) {
    console.error("Payment methods error:", err);
    return NextResponse.json({ error: "決済方法の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { code, displayName, isActive, displayOrder } = body;

    if (!code || !displayName) {
      return NextResponse.json({ error: "コードと表示名は必須です" }, { status: 400 });
    }

    const existing = await prisma.paymentMethodSetting.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "同じコードの決済方法が既に存在します" }, { status: 409 });
    }

    const method = await prisma.paymentMethodSetting.create({
      data: {
        code,
        displayName,
        isActive: isActive ?? true,
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json(method, { status: 201 });
  } catch (err) {
    console.error("Create payment method error:", err);
    return NextResponse.json({ error: "決済方法の作成に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();

    // Batch update
    if (Array.isArray(body)) {
      for (const item of body) {
        await prisma.paymentMethodSetting.update({
          where: { id: item.id },
          data: {
            ...(item.displayName !== undefined && { displayName: item.displayName }),
            ...(item.isActive !== undefined && { isActive: item.isActive }),
            ...(item.displayOrder !== undefined && { displayOrder: item.displayOrder }),
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    // Single update
    const { id, displayName, isActive, displayOrder } = body;
    if (!id) {
      return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
    }

    const method = await prisma.paymentMethodSetting.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    return NextResponse.json(method);
  } catch (err) {
    console.error("Update payment method error:", err);
    return NextResponse.json({ error: "決済方法の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
    }

    await prisma.paymentMethodSetting.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete payment method error:", err);
    return NextResponse.json({ error: "決済方法の削除に失敗しました" }, { status: 500 });
  }
}
