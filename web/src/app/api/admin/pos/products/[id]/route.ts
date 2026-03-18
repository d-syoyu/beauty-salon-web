// src/app/api/admin/pos/products/[id]/route.ts
// Admin Product CRUD - Get, Update, Delete

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
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (err) {
    console.error("Get product error:", err);
    return NextResponse.json({ error: "商品の取得に失敗しました" }, { status: 500 });
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
    const { name, categoryName, unitPrice, stockQuantity, sku, barcode, description, isActive } =
      body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(categoryName != null && { categoryName }),
        ...(unitPrice != null && { unitPrice: parseInt(unitPrice) }),
        ...(stockQuantity != null && { stockQuantity: parseInt(stockQuantity) }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(barcode !== undefined && { barcode: barcode || null }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive != null && { isActive }),
      },
    });

    return NextResponse.json(product);
  } catch (err: unknown) {
    console.error("Update product error:", err);
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ error: "商品の更新に失敗しました" }, { status: 500 });
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
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete product error:", err);
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ error: "商品の削除に失敗しました" }, { status: 500 });
  }
}
