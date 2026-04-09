import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';
import { SELECTED_SHOP_COOKIE } from '@/lib/admin-shop';

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const body = await request.json();
  const shopId = typeof body.shopId === 'string' ? body.shopId : null;

  if (shopId) {
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, isActive: true },
      select: { id: true },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });
    }
  }

  const response = NextResponse.json({ success: true });

  if (shopId) {
    response.cookies.set(SELECTED_SHOP_COOKIE, shopId, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10,
      ...(process.env.NODE_ENV === 'production' ? { secure: true } : {}),
    });
  } else {
    response.cookies.delete(SELECTED_SHOP_COOKIE);
  }

  return response;
}
