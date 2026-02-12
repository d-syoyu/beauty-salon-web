// src/app/api/admin/sales/route.ts
// Admin Sales API - List & Create

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const paymentMethod = searchParams.get("paymentMethod");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (startDate) {
      const start = new Date(startDate + "T00:00:00");
      const end = endDate
        ? new Date(endDate + "T23:59:59.999")
        : new Date("2099-12-31T23:59:59.999");
      where.saleDate = { gte: start, lte: end };
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: { orderBy: { orderIndex: "asc" } },
        user: { select: { name: true, phone: true } },
        coupon: { select: { code: true, name: true } },
        payments: { orderBy: { orderIndex: "asc" } },
        createdByUser: { select: { name: true } },
      },
      orderBy: [{ saleDate: "desc" }, { saleTime: "desc" }],
      skip,
      take: limit,
    });

    return NextResponse.json(sales);
  } catch (err) {
    console.error("Admin sales error:", err);
    return NextResponse.json({ error: "売上の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const {
      userId,
      customerName,
      customerPhone,
      reservationId,
      items,
      paymentMethod,
      discountAmount,
      couponId,
      couponDiscount,
      note,
      taxRate: bodyTaxRate,
    } = body;

    if (!items?.length || !paymentMethod) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    // Get tax rate from settings
    const taxRateSetting = await prisma.settings.findUnique({ where: { key: "tax_rate" } });
    const taxRate = bodyTaxRate ?? (taxRateSetting ? parseInt(taxRateSetting.value) : 10);

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: { unitPrice: number; quantity: number }) =>
        sum + item.unitPrice * item.quantity,
      0
    );
    const discount = (discountAmount || 0) + (couponDiscount || 0);
    const taxableAmount = subtotal - discount;
    const taxAmount = Math.floor((taxableAmount * taxRate) / (100 + taxRate));
    const totalAmount = taxableAmount;

    // Generate sale number
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const count = await prisma.sale.count({
      where: {
        saleNumber: { startsWith: dateStr },
      },
    });
    const saleNumber = `${dateStr}-${String(count + 1).padStart(4, "0")}`;

    const saleTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        userId: userId || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        reservationId: reservationId || null,
        subtotal,
        taxAmount,
        taxRate,
        discountAmount: discountAmount || 0,
        couponId: couponId || null,
        couponDiscount: couponDiscount || 0,
        totalAmount,
        paymentMethod,
        paymentStatus: "PAID",
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        saleTime,
        note: note || null,
        createdBy: user!.id,
        items: {
          create: items.map(
            (
              item: {
                itemType: string;
                menuId?: string;
                menuName?: string;
                categoryId?: string;
                category?: string;
                duration?: number;
                productId?: string;
                productName?: string;
                quantity: number;
                unitPrice: number;
              },
              idx: number
            ) => ({
              itemType: item.itemType || "MENU",
              menuId: item.menuId || null,
              menuName: item.menuName || null,
              categoryId: item.categoryId || null,
              category: item.category || null,
              duration: item.duration || null,
              productId: item.productId || null,
              productName: item.productName || null,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice * (item.quantity || 1),
              orderIndex: idx,
            })
          ),
        },
      },
      include: {
        items: { orderBy: { orderIndex: "asc" } },
        user: { select: { name: true } },
      },
    });

    // If linked to a reservation, mark it completed
    if (reservationId) {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { status: "COMPLETED" },
      });
    }

    // Record coupon usage
    if (couponId) {
      await prisma.couponUsage.create({
        data: {
          couponId,
          saleId: sale.id,
          customerId: userId || null,
        },
      });
      await prisma.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    console.error("Create sale error:", err);
    return NextResponse.json({ error: "売上の作成に失敗しました" }, { status: 500 });
  }
}
