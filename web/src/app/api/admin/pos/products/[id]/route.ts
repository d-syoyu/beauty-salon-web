import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { shops: { select: { shopId: true } } },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Failed to load product.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      categoryName,
      unitPrice,
      stockQuantity,
      sku,
      barcode,
      description,
      imageUrl,
      isActive,
      isVisibleOnStorefront,
      shopId,
    } = body;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(name != null && { name }),
          ...(categoryName != null && { categoryName }),
          ...(unitPrice != null && { unitPrice: parseInt(String(unitPrice), 10) }),
          ...(stockQuantity != null && { stockQuantity: parseInt(String(stockQuantity), 10) }),
          ...(sku !== undefined && { sku: sku || null }),
          ...(barcode !== undefined && { barcode: barcode || null }),
          ...(description !== undefined && { description: description || null }),
          ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
          ...(isActive != null && { isActive }),
          ...(isVisibleOnStorefront != null && { isVisibleOnStorefront }),
        },
      });

      if (typeof shopId === 'string' && shopId) {
        await tx.productShop.upsert({
          where: { productId_shopId: { productId: id, shopId } },
          update: {},
          create: { productId: id, shopId },
        });
      }

      return updated;
    });

    const hydrated = await prisma.product.findUnique({
      where: { id: product.id },
      include: { shops: { select: { shopId: true } } },
    });

    return NextResponse.json(hydrated);
  } catch (error: unknown) {
    console.error('Update product error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete product error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to archive product.' }, { status: 500 });
  }
}
