import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatLocalDate, parseLocalDate } from "@/lib/date-utils";

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function diffMinutes(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  return Math.max(endHours * 60 + endMinutes - (startHours * 60 + startMinutes), 0);
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const staffId = body.staffId as string | undefined;
    const action = body.action as "start" | "end" | undefined;
    const dateStr = (body.date as string | undefined) || formatLocalDate(new Date());
    if (!staffId || !action) {
      return NextResponse.json({ error: "staffId and action are required." }, { status: 400 });
    }

    const date = parseLocalDate(dateStr);
    const record = await prisma.attendanceRecord.findUnique({
      where: { staffId_date: { staffId, date } },
      include: { breaks: true },
    });
    if (!record) {
      return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    }

    if (action === "start") {
      const openBreak = record.breaks.find((item) => !item.endTime);
      if (openBreak) {
        return NextResponse.json({ error: "Break already started." }, { status: 409 });
      }
      const created = await prisma.attendanceBreak.create({
        data: {
          attendanceRecordId: record.id,
          startTime: nowTime(),
        },
      });
      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          status: "on_break",
          updatedByUserId: user?.id,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }

    const openBreak = record.breaks.find((item) => !item.endTime);
    if (!openBreak) {
      return NextResponse.json({ error: "No active break found." }, { status: 409 });
    }

    const endTime = nowTime();
    const updatedBreak = await prisma.attendanceBreak.update({
      where: { id: openBreak.id },
      data: {
        endTime,
        endedAt: new Date(),
        durationMinutes: diffMinutes(openBreak.startTime, endTime),
      },
    });

    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status: "working",
        updatedByUserId: user?.id,
      },
    });

    return NextResponse.json(updatedBreak);
  } catch (err) {
    console.error("Attendance break error:", err);
    return NextResponse.json({ error: "Failed to update break state." }, { status: 500 });
  }
}
