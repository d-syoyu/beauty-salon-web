import type { Prisma, PrismaClient } from "@prisma/client";
import { parseLocalDate } from "@/lib/date-utils";
import { prisma } from "@/lib/db";
import { getEffectiveShift } from "@/lib/workforce-core";
import { consumeLeaveBalance, syncAttendanceFromShift } from "@/lib/workforce-server";

type Tx = PrismaClient | Prisma.TransactionClient;

export type WorkforceRequestType = "attendance_correction" | "leave" | "overtime";

export function buildRequestKey(type: WorkforceRequestType, id: string) {
  return `${type}__${id}`;
}

export function parseRequestKey(requestKey: string): { type: WorkforceRequestType; id: string } {
  const [type, id] = requestKey.split("__");
  if (!id || !["attendance_correction", "leave", "overtime"].includes(type)) {
    throw new Error("Invalid request key");
  }
  return { type: type as WorkforceRequestType, id };
}

async function logAction(
  tx: Tx,
  params: { type: WorkforceRequestType; requestId: string; action: string; staffId?: string; actedByUserId?: string; comment?: string }
) {
  await tx.approvalActionLog.create({
    data: {
      requestType: params.type,
      requestId: params.requestId,
      action: params.action,
      staffId: params.staffId,
      actedByUserId: params.actedByUserId,
      comment: params.comment,
    },
  });
}

async function loadStaffForDate(tx: Tx, staffId: string, date: Date) {
  return tx.staff.findUnique({
    where: { id: staffId },
    include: {
      schedules: { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } },
      scheduleOverrides: { where: { date } },
      leaveRequests: { where: { date, status: "approved" } },
      overtimeRequests: { where: { date, status: "approved" } },
    },
  });
}

export async function listUnifiedRequests(tx: Tx = prisma) {
  const [corrections, leaveRequests, overtimeRequests] = await Promise.all([
    tx.attendanceCorrectionRequest.findMany({
      include: { staff: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    }),
    tx.leaveRequest.findMany({
      include: {
        staff: { select: { id: true, name: true, role: true } },
        leaveType: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    tx.overtimeRequest.findMany({
      include: { staff: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return [
    ...corrections.map((item) => ({
      requestKey: buildRequestKey("attendance_correction", item.id),
      type: "attendance_correction" as const,
      id: item.id,
      staffId: item.staffId,
      staffName: item.staff.name,
      staffRole: item.staff.role,
      date: item.date,
      status: item.status,
      summary: `${item.requestedStartTime || "--:--"} - ${item.requestedEndTime || "--:--"}`,
      note: item.note,
      createdAt: item.createdAt,
    })),
    ...leaveRequests.map((item) => ({
      requestKey: buildRequestKey("leave", item.id),
      type: "leave" as const,
      id: item.id,
      staffId: item.staffId,
      staffName: item.staff.name,
      staffRole: item.staff.role,
      date: item.date,
      status: item.status,
      summary: `${item.leaveType.name} / ${item.unit}`,
      note: item.note,
      createdAt: item.createdAt,
    })),
    ...overtimeRequests.map((item) => ({
      requestKey: buildRequestKey("overtime", item.id),
      type: "overtime" as const,
      id: item.id,
      staffId: item.staffId,
      staffName: item.staff.name,
      staffRole: item.staff.role,
      date: item.date,
      status: item.status,
      summary: `${item.requestedStartTime || "--:--"} - ${item.requestedEndTime}`,
      note: item.note,
      createdAt: item.createdAt,
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export async function approveRequest(
  tx: Tx,
  requestKey: string,
  actedByUserId?: string,
  comment?: string
) {
  const { type, id } = parseRequestKey(requestKey);

  if (type === "attendance_correction") {
    const request = await tx.attendanceCorrectionRequest.findUnique({ where: { id } });
    if (!request) throw new Error("Correction request not found");

    const staff = await loadStaffForDate(tx, request.staffId, request.date);
    if (!staff) throw new Error("Staff not found");

    const shift = getEffectiveShift(staff, request.date);
    const today = new Date();
    const isFuture = request.date > today || request.requestCategory === "shift_change";

    if (isFuture) {
      await tx.staffScheduleOverride.upsert({
        where: { staffId_date: { staffId: request.staffId, date: request.date } },
        update: {
          startTime: request.requestedStartTime ?? null,
          endTime: request.requestedEndTime ?? null,
          breakMinutes: request.requestedBreakMinutes ?? 0,
          status: "scheduled",
          note: request.note,
          source: "approved_request",
        },
        create: {
          staffId: request.staffId,
          date: request.date,
          startTime: request.requestedStartTime ?? null,
          endTime: request.requestedEndTime ?? null,
          breakMinutes: request.requestedBreakMinutes ?? 0,
          status: "scheduled",
          note: request.note,
          source: "approved_request",
        },
      });
    } else {
      const record = await syncAttendanceFromShift(tx, request.staffId, request.date.toISOString().slice(0, 10), shift, actedByUserId);
      await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          actualStartTime: request.requestedStartTime ?? record.actualStartTime,
          actualEndTime: request.requestedEndTime ?? record.actualEndTime,
          totalBreakMinutes: request.requestedBreakMinutes ?? record.totalBreakMinutes,
          updatedByUserId: actedByUserId,
        },
      });
    }

    const updated = await tx.attendanceCorrectionRequest.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedByUserId: actedByUserId,
        adminComment: comment ?? request.adminComment,
      },
    });

    await logAction(tx, {
      type,
      requestId: id,
      action: "approved",
      staffId: request.staffId,
      actedByUserId,
      comment,
    });

    return updated;
  }

  if (type === "leave") {
    const request = await tx.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true },
    });
    if (!request) throw new Error("Leave request not found");

    if (request.leaveType.deductsBalance) {
      await consumeLeaveBalance(tx, request.staffId, request.leaveTypeId, request.requestedDays);
    }

    await tx.staffScheduleOverride.upsert({
      where: { staffId_date: { staffId: request.staffId, date: request.date } },
      update: {
        startTime: null,
        endTime: null,
        breakMinutes: 0,
        status: "leave",
        note: request.note,
        source: "leave_request",
      },
      create: {
        staffId: request.staffId,
        date: request.date,
        startTime: null,
        endTime: null,
        breakMinutes: 0,
        status: "leave",
        note: request.note,
        source: "leave_request",
      },
    });

    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedByUserId: actedByUserId,
        adminComment: comment ?? request.adminComment,
      },
    });

    await logAction(tx, {
      type,
      requestId: id,
      action: "approved",
      staffId: request.staffId,
      actedByUserId,
      comment,
    });

    return updated;
  }

  const request = await tx.overtimeRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Overtime request not found");

  const staff = await loadStaffForDate(tx, request.staffId, request.date);
  if (!staff) throw new Error("Staff not found");
  const shift = getEffectiveShift(staff, request.date);

  await tx.staffScheduleOverride.upsert({
    where: { staffId_date: { staffId: request.staffId, date: request.date } },
    update: {
      startTime: request.requestedStartTime || shift?.startTime || "10:00",
      endTime: request.requestedEndTime,
      breakMinutes: shift?.breakMinutes ?? 0,
      status: "scheduled",
      note: request.note,
      source: "approved_request",
    },
    create: {
      staffId: request.staffId,
      date: request.date,
      startTime: request.requestedStartTime || shift?.startTime || "10:00",
      endTime: request.requestedEndTime,
      breakMinutes: shift?.breakMinutes ?? 0,
      status: "scheduled",
      note: request.note,
      source: "approved_request",
    },
  });

  const updated = await tx.overtimeRequest.update({
    where: { id },
    data: {
      status: "approved",
      approvedAt: new Date(),
      approvedByUserId: actedByUserId,
      adminComment: comment ?? request.adminComment,
    },
  });

  await logAction(tx, {
    type,
    requestId: id,
    action: "approved",
    staffId: request.staffId,
    actedByUserId,
    comment,
  });

  return updated;
}

export async function rejectRequest(
  tx: Tx,
  requestKey: string,
  actedByUserId?: string,
  comment?: string
) {
  const { type, id } = parseRequestKey(requestKey);

  if (type === "attendance_correction") {
    const request = await tx.attendanceCorrectionRequest.update({
      where: { id },
      data: {
        status: "rejected",
        approvedByUserId: actedByUserId,
        adminComment: comment,
      },
    });
    await logAction(tx, { type, requestId: id, action: "rejected", staffId: request.staffId, actedByUserId, comment });
    return request;
  }

  if (type === "leave") {
    const request = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: "rejected",
        approvedByUserId: actedByUserId,
        adminComment: comment,
      },
    });
    await logAction(tx, { type, requestId: id, action: "rejected", staffId: request.staffId, actedByUserId, comment });
    return request;
  }

  const request = await tx.overtimeRequest.update({
    where: { id },
    data: {
      status: "rejected",
      approvedByUserId: actedByUserId,
      adminComment: comment,
    },
  });
  await logAction(tx, { type, requestId: id, action: "rejected", staffId: request.staffId, actedByUserId, comment });
  return request;
}

export function normalizeRequestDate(date: string) {
  return parseLocalDate(date);
}
