import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDate } from "@/lib/date-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.date) {
      return NextResponse.json({ error: "date is required." }, { status: 400 });
    }

    const parsedDate = parseLocalDate(body.date);
    const override = await prisma.staffScheduleOverride.upsert({
      where: { staffId_date: { staffId: id, date: parsedDate } },
      update: {
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        breakMinutes: body.breakMinutes ?? 0,
        status: body.status || (body.startTime && body.endTime ? "scheduled" : "off"),
        note: body.note ?? null,
        source: body.source || "manual",
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
        patternCode: body.patternCode ?? null,
      },
      create: {
        staffId: id,
        date: parsedDate,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        breakMinutes: body.breakMinutes ?? 0,
        status: body.status || (body.startTime && body.endTime ? "scheduled" : "off"),
        note: body.note ?? null,
        source: body.source || "manual",
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
        patternCode: body.patternCode ?? null,
      },
    });

    return NextResponse.json(override);
  } catch (err) {
    console.error("Schedule override upsert error:", err);
    return NextResponse.json({ error: "Failed to update shift override." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const dateStr = request.nextUrl.searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json({ error: "date is required." }, { status: 400 });
    }

    await prisma.staffScheduleOverride.deleteMany({
      where: { staffId: id, date: parseLocalDate(dateStr) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Schedule override delete error:", err);
    return NextResponse.json({ error: "Failed to remove shift override." }, { status: 500 });
  }
}
