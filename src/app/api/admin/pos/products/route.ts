// src/app/api/admin/pos/products/route.ts
// Admin Product CRUD - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const isActiveParam = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (isActiveParam !== null) {
      where.isActive = isActiveParam !== "false";
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { categoryName: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ categoryName: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, total });
  } catch (err) {
    console.error("Get products error:", err);
    return NextResponse.json({ error: "商品の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, categoryName, unitPrice, stockQuantity, sku, barcode, description } = body;

    if (!name || !categoryName || unitPrice == null) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        categoryName,
        unitPrice: parseInt(unitPrice),
        stockQuantity: stockQuantity != null ? parseInt(stockQuantity) : 0,
        sku: sku || null,
        barcode: barcode || null,
        description: description || null,
        isActive: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err: unknown) {
    console.error("Create product error:", err);
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "SKUが重複しています" }, { status: 409 });
    }
    return NextResponse.json({ error: "商品の作成に失敗しました" }, { status: 500 });
  }
}
