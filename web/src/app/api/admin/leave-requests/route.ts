import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDate } from "@/lib/date-utils";
import { ensureAutoLeaveGrants } from "@/lib/workforce-server";

export async function GET(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    await ensureAutoLeaveGrants();

    const status = request.nextUrl.searchParams.get("status");
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        staff: { select: { id: true, name: true, role: true } },
        leaveType: { select: { id: true, code: true, name: true, deductsBalance: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(leaveRequests);
  } catch (err) {
    console.error("Leave requests load error:", err);
    return NextResponse.json({ error: "Failed to load leave requests." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    if (!body.staffId || !body.leaveTypeId || !body.date) {
      return NextResponse.json({ error: "staffId, leaveTypeId, and date are required." }, { status: 400 });
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        staffId: body.staffId,
        leaveTypeId: body.leaveTypeId,
        date: parseLocalDate(body.date),
        unit: body.unit || "full",
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        requestedDays: typeof body.requestedDays === "number" ? body.requestedDays : 1,
        status: body.status || "submitted",
        note: body.note ?? null,
        createdByUserId: user?.id,
      },
    });

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (err) {
    console.error("Leave request create error:", err);
    return NextResponse.json({ error: "Failed to create leave request." }, { status: 500 });
  }
}
