import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;
  const patterns = await prisma.shiftPattern.findMany({
    where: { staffId: id, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(patterns);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  if (!body.code || !body.name || !body.startTime || !body.endTime) {
    return NextResponse.json({ error: "code, name, startTime, endTime は必須です。" }, { status: 400 });
  }

  try {
    const pattern = await prisma.shiftPattern.create({
      data: {
        staffId: id,
        code: body.code,
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        breakMinutes: Number(body.breakMinutes ?? 0),
        color: body.color ?? null,
        isActive: true,
      },
    });
    return NextResponse.json(pattern, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "同じコードのパターンが既に存在します。" }, { status: 409 });
    }
    throw e;
  }
}
