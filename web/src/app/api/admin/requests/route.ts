import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDate } from "@/lib/date-utils";
import { listUnifiedRequests } from "@/lib/workforce-requests";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const requests = await listUnifiedRequests(prisma);
    return NextResponse.json(requests);
  } catch (err) {
    console.error("Request queue load error:", err);
    return NextResponse.json({ error: "Failed to load request queue." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const type = body.type as "attendance_correction" | "leave" | "overtime" | undefined;
    if (!type || !body.staffId || !body.date) {
      return NextResponse.json({ error: "type, staffId, and date are required." }, { status: 400 });
    }

    const date = parseLocalDate(body.date);

    if (type === "attendance_correction") {
      const created = await prisma.attendanceCorrectionRequest.create({
        data: {
          staffId: body.staffId,
          attendanceRecordId: body.attendanceRecordId ?? null,
          date,
          requestedStartTime: body.requestedStartTime ?? null,
          requestedEndTime: body.requestedEndTime ?? null,
          requestedBreakMinutes: body.requestedBreakMinutes ?? null,
          requestCategory: body.requestCategory || "correction",
          status: body.status || "submitted",
          note: body.note ?? null,
          createdByUserId: user?.id,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }

    if (type === "leave") {
      const created = await prisma.leaveRequest.create({
        data: {
          staffId: body.staffId,
          leaveTypeId: body.leaveTypeId,
          date,
          unit: body.unit || "full",
          startTime: body.startTime ?? null,
          endTime: body.endTime ?? null,
          requestedDays: typeof body.requestedDays === "number" ? body.requestedDays : 1,
          status: body.status || "submitted",
          note: body.note ?? null,
          createdByUserId: user?.id,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }

    const created = await prisma.overtimeRequest.create({
      data: {
        staffId: body.staffId,
        date,
        requestedStartTime: body.requestedStartTime ?? null,
        requestedEndTime: body.requestedEndTime,
        requestCategory: body.requestCategory || "overtime",
        isHolidayWork: body.isHolidayWork ?? false,
        status: body.status || "submitted",
        note: body.note ?? null,
        createdByUserId: user?.id,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Request create error:", err);
    return NextResponse.json({ error: "Failed to create request." }, { status: 500 });
  }
}
