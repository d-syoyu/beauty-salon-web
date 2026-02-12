// src/app/api/admin/customers/[id]/route.ts
// Admin Customer Detail - Get, Update, Delete

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        newsletterOptOut: true,
        reservations: {
          orderBy: [{ date: "desc" }, { startTime: "desc" }],
          include: {
            items: { orderBy: { orderIndex: "asc" } },
          },
        },
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (err) {
    console.error("Customer detail error:", err);
    return NextResponse.json({ error: "顧客情報の取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    if (body.email && body.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: body.email } });
      if (duplicate) {
        return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
      }
    }

    const customer = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.newsletterOptOut !== undefined && { newsletterOptOut: body.newsletterOptOut }),
      },
    });

    return NextResponse.json(customer);
  } catch (err) {
    console.error("Update customer error:", err);
    return NextResponse.json({ error: "顧客の更新に失敗しました" }, { status: 500 });
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

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete customer error:", err);
    return NextResponse.json({ error: "顧客の削除に失敗しました" }, { status: 500 });
  }
}
