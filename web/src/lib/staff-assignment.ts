import { prisma } from "@/lib/db";
import { formatLocalDate, parseLocalDateEnd, parseLocalDateStart } from "@/lib/date-utils";
import { getEffectiveShift } from "@/lib/workforce-core";

interface StaffWithDetails {
  id: string;
  name: string;
  displayOrder: number;
  schedules: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[];
  scheduleOverrides: {
    date: Date;
    startTime: string | null;
    endTime: string | null;
    breakMinutes: number;
    status: string;
    note: string | null;
    source: string;
  }[];
  menuAssignments: { menuId: string }[];
  leaveRequests?: {
    date: Date;
    status: string;
    unit: string;
    startTime: string | null;
    endTime: string | null;
    note: string | null;
  }[];
  overtimeRequests?: {
    date: Date;
    status: string;
    requestedStartTime: string | null;
    requestedEndTime: string;
    isHolidayWork: boolean;
    note: string | null;
  }[];
}

export function getStaffWorkingHours(
  staff: StaffWithDetails,
  date: Date
): { startTime: string; endTime: string } | null {
  const shift = getEffectiveShift(staff, date);
  if (!shift?.isWorking || !shift.startTime || !shift.endTime) return null;
  return { startTime: shift.startTime, endTime: shift.endTime };
}

export function canStaffHandleMenus(
  staff: Pick<StaffWithDetails, "menuAssignments">,
  menuIds: string[]
): boolean {
  if (staff.menuAssignments.length === 0) return true;
  const assignedIds = new Set(staff.menuAssignments.map((a) => a.menuId));
  return menuIds.every((id) => assignedIds.has(id));
}

export async function getQualifiedStaff(
  date: Date,
  _dayOfWeek: number,
  startTime: string,
  endTime: string,
  menuIds: string[]
): Promise<StaffWithDetails[]> {
  const dateStr = formatLocalDate(date);
  const startOfDay = parseLocalDateStart(dateStr);
  const endOfDay = parseLocalDateEnd(dateStr);

  const allStaff = await prisma.staff.findMany({
    where: { isActive: true },
    include: {
      schedules: { where: { isActive: true } },
      scheduleOverrides: {
        where: { date: { gte: startOfDay, lte: endOfDay } },
      },
      leaveRequests: {
        where: { date: { gte: startOfDay, lte: endOfDay }, status: "approved" },
      },
      overtimeRequests: {
        where: { date: { gte: startOfDay, lte: endOfDay }, status: "approved" },
      },
      menuAssignments: { select: { menuId: true } },
    },
    orderBy: { displayOrder: "asc" },
  });

  return allStaff.filter((staff) => {
    const hours = getStaffWorkingHours(staff, date);
    if (!hours) return false;
    if (startTime < hours.startTime || endTime > hours.endTime) return false;
    return canStaffHandleMenus(staff, menuIds);
  });
}

export async function autoAssignStaff(
  dateStr: string,
  date: Date,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  menuIds: string[]
): Promise<{ staffId: string; staffName: string } | null> {
  const qualifiedStaff = await getQualifiedStaff(date, dayOfWeek, startTime, endTime, menuIds);
  if (qualifiedStaff.length === 0) return null;

  const startOfDay = parseLocalDateStart(dateStr);
  const endOfDay = parseLocalDateEnd(dateStr);

  const existingReservations = await prisma.reservation.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      status: "CONFIRMED",
      staffId: { in: qualifiedStaff.map((s) => s.id) },
    },
    select: { staffId: true, startTime: true, endTime: true },
  });

  const availableStaff = qualifiedStaff.filter((staff) => {
    const reservations = existingReservations.filter((r) => r.staffId === staff.id);
    return !reservations.some((r) => startTime < r.endTime && endTime > r.startTime);
  });
  if (availableStaff.length === 0) return null;

  const ranked = availableStaff
    .map((staff) => ({
      staff,
      count: existingReservations.filter((r) => r.staffId === staff.id).length,
    }))
    .sort((left, right) => {
      if (left.count !== right.count) return left.count - right.count;
      return left.staff.displayOrder - right.staff.displayOrder;
    });

  return {
    staffId: ranked[0].staff.id,
    staffName: ranked[0].staff.name,
  };
}
