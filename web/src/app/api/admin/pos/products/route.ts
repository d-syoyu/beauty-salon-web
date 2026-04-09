import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSelectedShopIdFromCookies } from '@/lib/admin-shop';

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const isActiveParam = searchParams.get('isActive');
    const shopIdParam = searchParams.get('shopId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;
    const selectedShopId = shopIdParam || (await getSelectedShopIdFromCookies(prisma));

    const where: Record<string, unknown> = {};
    if (isActiveParam !== null) where.isActive = isActiveParam !== 'false';
    if (selectedShopId) where.shops = { some: { shopId: selectedShopId } };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { categoryName: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          shops: { select: { shopId: true } },
        },
        orderBy: [{ categoryName: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, total });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to load products.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const selectedShopId = (typeof body.shopId === 'string' && body.shopId) || (await getSelectedShopIdFromCookies(prisma));
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
    } = body;

    if (!name || !categoryName || unitPrice == null) {
      return NextResponse.json({ error: 'Name, category, and price are required.' }, { status: 400 });
    }

    const shopLinks = selectedShopId
      ? [{ shopId: selectedShopId }]
      : (await prisma.shop.findMany({ where: { isActive: true }, select: { id: true } })).map((shop) => ({ shopId: shop.id }));

    const product = await prisma.product.create({
      data: {
        name,
        categoryName,
        unitPrice: parseInt(String(unitPrice), 10),
        stockQuantity: stockQuantity != null ? parseInt(String(stockQuantity), 10) : 0,
        sku: sku || null,
        barcode: barcode || null,
        description: description || null,
        imageUrl: imageUrl || null,
        isActive: isActive !== false,
        isVisibleOnStorefront: isVisibleOnStorefront !== false,
        shops: shopLinks.length > 0 ? { create: shopLinks } : undefined,
      },
      include: {
        shops: { select: { shopId: true } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error('Create product error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'SKU already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
  }
}
