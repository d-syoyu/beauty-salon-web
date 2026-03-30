import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; patternId: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id, patternId } = await params;
  const body = await request.json();

  try {
    const pattern = await prisma.shiftPattern.updateMany({
      where: { id: patternId, staffId: id },
      data: {
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        breakMinutes: Number(body.breakMinutes ?? 0),
        color: body.color ?? null,
      },
    });
    if (pattern.count === 0) {
      return NextResponse.json({ error: "パターンが見つかりません。" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "同じコードのパターンが既に存在します。" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; patternId: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id, patternId } = await params;
  const result = await prisma.shiftPattern.updateMany({
    where: { id: patternId, staffId: id },
    data: { isActive: false },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "パターンが見つかりません。" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
