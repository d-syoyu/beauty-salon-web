import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  try {
    const photo = await prisma.galleryPhoto.update({
      where: { id },
      data: {
        ...(body.imageUrl !== undefined && { imageUrl: String(body.imageUrl).trim() }),
        ...(body.caption !== undefined && { caption: String(body.caption).trim() || null }),
        ...(body.displayOrder !== undefined && { displayOrder: Number(body.displayOrder) }),
        ...(body.isPublished !== undefined && { isPublished: Boolean(body.isPublished) }),
      },
    });

    return NextResponse.json(photo);
  } catch {
    return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;

  try {
    await prisma.galleryPhoto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  }
}
