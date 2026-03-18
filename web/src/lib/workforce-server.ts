import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatLocalDate, parseLocalDate, parseLocalDateEnd, parseLocalDateStart } from "@/lib/date-utils";
import {
  addMonths,
  deriveAttendanceMetrics,
  getEffectiveShift,
  getJapanStatutoryLeaveDays,
  getLeaveGrantSchedule,
  type EffectiveShift,
} from "@/lib/workforce-core";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function ensureDefaultWorkforceSetup(tx: Tx = prisma) {
  const leavePolicy = await tx.leavePolicy.upsert({
    where: { id: "default-leave-policy" },
    update: {},
    create: {
      id: "default-leave-policy",
      name: "Default Annual Leave Policy",
      grantMode: "hire_date",
      notes: "Statutory annual leave baseline.",
    },
  });

  const leaveTypes = [
    { id: "leave-paid", code: "PAID_LEAVE", name: "Paid Leave", unit: "full", deductsBalance: true, color: "#2563eb" },
    { id: "leave-comp", code: "COMP_DAY", name: "Compensatory Leave", unit: "full", deductsBalance: true, color: "#0891b2" },
    { id: "leave-absence", code: "ABSENCE", name: "Absence", unit: "full", deductsBalance: false, color: "#ef4444" },
    { id: "leave-special", code: "SPECIAL_LEAVE", name: "Special Leave", unit: "full", deductsBalance: false, color: "#7c3aed" },
  ];

  for (const leaveType of leaveTypes) {
    await tx.leaveType.upsert({
      where: { code: leaveType.code },
      update: leaveType,
      create: leaveType,
    });
  }

  const staff = await tx.staff.findMany({
    where: { isActive: true },
    select: { id: true, createdAt: true },
  });

  for (const member of staff) {
    await tx.staffEmploymentProfile.upsert({
      where: { staffId: member.id },
      update: {
        leavePolicyId: leavePolicy.id,
      },
      create: {
        staffId: member.id,
        hireDate: member.createdAt,
        employmentType: "full_time",
        prescribedWeeklyDays: 5,
        prescribedAnnualDays: 245,
        leavePolicyId: leavePolicy.id,
      },
    });

    const defaultPatterns = [
      { code: "DAY", name: "Day", startTime: "10:00", endTime: "20:00", breakMinutes: 60, color: "#0f766e" },
      { code: "EARLY", name: "Early", startTime: "09:00", endTime: "18:00", breakMinutes: 60, color: "#2563eb" },
      { code: "LATE", name: "Late", startTime: "11:00", endTime: "20:00", breakMinutes: 60, color: "#7c3aed" },
      { code: "SHORT", name: "Short", startTime: "10:00", endTime: "17:00", breakMinutes: 45, color: "#ea580c" },
    ];

    for (const pattern of defaultPatterns) {
      await tx.shiftPattern.upsert({
        where: { staffId_code: { staffId: member.id, code: pattern.code } },
        update: pattern,
        create: {
          staffId: member.id,
          ...pattern,
        },
      });
    }
  }

  return { leavePolicy };
}

function getFixedGrantDates(hireDate: Date, today: Date, month: number, day: number) {
  const eligibleDate = addMonths(hireDate, 6);
  const grantDates: Date[] = [];
  let currentYear = eligibleDate.getFullYear();

  while (currentYear <= today.getFullYear() && grantDates.length < 7) {
    const candidate = new Date(currentYear, month - 1, day, 12, 0, 0, 0);
    if (candidate >= eligibleDate && candidate <= today) {
      grantDates.push(candidate);
    }
    currentYear += 1;
  }

  return grantDates;
}

export async function ensureAutoLeaveGrants(tx: Tx = prisma) {
  await ensureDefaultWorkforceSetup(tx);

  const paidLeaveType = await tx.leaveType.findUnique({
    where: { code: "PAID_LEAVE" },
    select: { id: true },
  });
  if (!paidLeaveType) return;

  const staffProfiles = await tx.staffEmploymentProfile.findMany({
    include: {
      staff: { select: { id: true, isActive: true } },
      leavePolicy: true,
    },
  });

  const today = new Date();

  for (const profile of staffProfiles) {
    if (!profile.staff.isActive || !profile.hireDate) continue;

    const existing = await tx.leaveGrant.findMany({
      where: {
        staffId: profile.staffId,
        leaveTypeId: paidLeaveType.id,
        source: "auto",
      },
      orderBy: { grantDate: "asc" },
      select: { grantDate: true },
    });

    const existingDates = new Set(existing.map((item) => formatLocalDate(item.grantDate)));

    const policy = profile.leavePolicy;
    const grantDates =
      policy?.grantMode === "fixed_date" && policy.fixedGrantMonth && policy.fixedGrantDay
        ? getFixedGrantDates(profile.hireDate, today, policy.fixedGrantMonth, policy.fixedGrantDay)
        : getLeaveGrantSchedule(profile.hireDate, today);

    for (const [index, grantDate] of grantDates.entries()) {
      const dateKey = formatLocalDate(grantDate);
      if (existingDates.has(dateKey)) continue;

      await tx.leaveGrant.create({
        data: {
          staffId: profile.staffId,
          leavePolicyId: profile.leavePolicyId,
          leaveTypeId: paidLeaveType.id,
          grantDate,
          expireDate: addMonths(grantDate, 12),
          grantedDays: getJapanStatutoryLeaveDays(index),
          source: "auto",
          note: "Auto-granted annual leave",
        },
      });
    }
  }
}

export async function getLeaveBalance(tx: Tx, staffId: string, leaveTypeCode = "PAID_LEAVE") {
  const leaveType = await tx.leaveType.findUnique({
    where: { code: leaveTypeCode },
    select: { id: true, code: true, name: true },
  });
  if (!leaveType) {
    return { leaveTypeId: null, leaveTypeCode, leaveTypeName: leaveTypeCode, granted: 0, used: 0, remaining: 0 };
  }

  const grants = await tx.leaveGrant.findMany({
    where: {
      staffId,
      leaveTypeId: leaveType.id,
    },
    orderBy: [{ expireDate: "asc" }, { grantDate: "asc" }],
  });

  const granted = grants.reduce((sum, item) => sum + item.grantedDays + item.remainingManualAdjustment, 0);
  const used = grants.reduce((sum, item) => sum + item.usedDays, 0);

  return {
    leaveTypeId: leaveType.id,
    leaveTypeCode: leaveType.code,
    leaveTypeName: leaveType.name,
    granted,
    used,
    remaining: Math.max(granted - used, 0),
  };
}

export async function consumeLeaveBalance(
  tx: Tx,
  staffId: string,
  leaveTypeId: string,
  requestedDays: number
) {
  const grants = await tx.leaveGrant.findMany({
    where: { staffId, leaveTypeId },
    orderBy: [{ expireDate: "asc" }, { grantDate: "asc" }],
  });

  let remaining = requestedDays;

  for (const grant of grants) {
    if (remaining <= 0) break;
    const available = grant.grantedDays + grant.remainingManualAdjustment - grant.usedDays;
    if (available <= 0) continue;
    const delta = Math.min(available, remaining);
    await tx.leaveGrant.update({
      where: { id: grant.id },
      data: { usedDays: grant.usedDays + delta },
    });
    remaining -= delta;
  }

  if (remaining > 0.0001) {
    throw new Error("Insufficient leave balance");
  }
}

export async function getMonthlyClosureBlockers(
  tx: Tx,
  staffId: string,
  year: number,
  month: number
) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const [unclosedAttendances, pendingCorrections, pendingLeave, pendingOvertime, negativeBalance] =
    await Promise.all([
      tx.attendanceRecord.count({
        where: {
          staffId,
          date: { gte: start, lte: end },
          OR: [{ actualStartTime: { not: null }, actualEndTime: null }, { status: { in: ["not_started", "working", "on_break"] } }],
        },
      }),
      tx.attendanceCorrectionRequest.count({
        where: { staffId, date: { gte: start, lte: end }, status: "submitted" },
      }),
      tx.leaveRequest.count({
        where: { staffId, date: { gte: start, lte: end }, status: "submitted" },
      }),
      tx.overtimeRequest.count({
        where: { staffId, date: { gte: start, lte: end }, status: "submitted" },
      }),
      getLeaveBalance(tx, staffId).then((balance) => (balance.remaining < 0 ? 1 : 0)),
    ]);

  const blockers: string[] = [];
  if (unclosedAttendances > 0) blockers.push("unclosed_attendance");
  if (pendingCorrections > 0) blockers.push("pending_correction_requests");
  if (pendingLeave > 0) blockers.push("pending_leave_requests");
  if (pendingOvertime > 0) blockers.push("pending_overtime_requests");
  if (negativeBalance > 0) blockers.push("leave_balance_conflict");
  return blockers;
}

export async function syncAttendanceFromShift(
  tx: Tx,
  staffId: string,
  dateStr: string,
  shift: EffectiveShift | null,
  actorUserId?: string
) {
  const date = parseLocalDate(dateStr);
  const existing = await tx.attendanceRecord.findUnique({
    where: { staffId_date: { staffId, date } },
    include: { breaks: true },
  });

  if (!existing) {
    return tx.attendanceRecord.create({
      data: {
        staffId,
        date,
        scheduledStartTime: shift?.startTime ?? null,
        scheduledEndTime: shift?.endTime ?? null,
        status: shift?.isWorking ? "not_started" : "absent",
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      include: { breaks: true },
    });
  }

  const totalBreakMinutes = existing.breaks.reduce((sum, item) => sum + item.durationMinutes, 0);
  const metrics = deriveAttendanceMetrics({
    shift,
    actualStartTime: existing.actualStartTime,
    actualEndTime: existing.actualEndTime,
    totalBreakMinutes,
  });

  return tx.attendanceRecord.update({
    where: { id: existing.id },
    data: {
      scheduledStartTime: shift?.startTime ?? null,
      scheduledEndTime: shift?.endTime ?? null,
      totalBreakMinutes,
      totalWorkMinutes: metrics.totalWorkMinutes,
      lateMinutes: metrics.lateMinutes,
      earlyLeaveMinutes: metrics.earlyLeaveMinutes,
      overtimeMinutes: metrics.overtimeMinutes,
      status: shift?.isWorking ? metrics.status : existing.actualStartTime ? metrics.status : "absent",
      updatedByUserId: actorUserId,
    },
    include: { breaks: true },
  });
}

export async function loadStaffShiftSubjects(tx: Tx, dateStr: string) {
  const start = parseLocalDateStart(dateStr);
  const end = parseLocalDateEnd(dateStr);
  return tx.staff.findMany({
    where: { isActive: true },
    include: {
      schedules: { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } },
      scheduleOverrides: { where: { date: { gte: start, lte: end } } },
      leaveRequests: { where: { date: { gte: start, lte: end }, status: "approved" } },
      overtimeRequests: { where: { date: { gte: start, lte: end }, status: "approved" } },
      attendanceRecords: {
        where: { date: { gte: start, lte: end } },
        include: { breaks: true },
      },
      correctionRequests: { where: { date: { gte: start, lte: end }, status: "submitted" } },
      employmentProfile: true,
    },
    orderBy: { displayOrder: "asc" },
  });
}

export function buildTodayOpsRow(staff: Awaited<ReturnType<typeof loadStaffShiftSubjects>>[number], date: Date) {
  const dateStr = formatLocalDate(date);
  const shift = getEffectiveShift(staff, date);
  const attendance = staff.attendanceRecords[0] || null;
  const activeBreak = attendance?.breaks.find((item) => !item.endTime) || null;

  return {
    staffId: staff.id,
    staffName: staff.name,
    role: staff.role,
    image: staff.image,
    date: dateStr,
    shift,
    attendance,
    activeBreak,
    pendingRequestCount: staff.correctionRequests.length,
    employmentWarning: !staff.employmentProfile?.hireDate ? "missing_hire_date" : null,
  };
}
