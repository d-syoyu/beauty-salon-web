import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDate } from "@/lib/date-utils";
import { Prisma } from "@prisma/client";

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

    // segments が2件以上の場合はJSONで保存し、startTime/endTimeは先頭・末尾に設定
    const segments: { startTime: string; endTime: string }[] | null =
      Array.isArray(body.segments) && body.segments.length >= 2 ? body.segments : null;
    const primaryStart = segments ? segments[0].startTime : (body.startTime ?? null);
    const primaryEnd = segments ? segments[segments.length - 1].endTime : (body.endTime ?? null);
    const isWorking = !!(primaryStart && primaryEnd);
    const defaultStatus = body.status || (isWorking ? "scheduled" : "off");

    const timeSegmentsValue = segments
      ? (segments as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    const override = await prisma.staffScheduleOverride.upsert({
      where: { staffId_date: { staffId: id, date: parsedDate } },
      update: {
        startTime: primaryStart,
        endTime: primaryEnd,
        timeSegments: timeSegmentsValue,
        breakMinutes: body.breakMinutes ?? 0,
        status: defaultStatus,
        note: body.note ?? null,
        source: body.source || "manual",
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
        patternCode: body.patternCode ?? null,
      },
      create: {
        staffId: id,
        date: parsedDate,
        startTime: primaryStart,
        endTime: primaryEnd,
        timeSegments: timeSegmentsValue,
        breakMinutes: body.breakMinutes ?? 0,
        status: defaultStatus,
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
