import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
      include: {
        shop: { select: { id: true, name: true } },
        sends: { orderBy: { sentAt: 'desc' } },
      },
    });

    return NextResponse.json({ announcement });
  } catch {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }
}
