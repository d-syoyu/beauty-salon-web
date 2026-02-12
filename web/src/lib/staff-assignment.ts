// src/lib/staff-assignment.ts
// スタイリスト自動割り当てロジック

import { prisma } from "@/lib/db";
import { parseLocalDateStart, parseLocalDateEnd } from "@/lib/date-utils";

interface StaffWithDetails {
  id: string;
  name: string;
  displayOrder: number;
  schedules: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[];
  scheduleOverrides: { date: Date; startTime: string | null; endTime: string | null }[];
  menuAssignments: { menuId: string }[];
}

/**
 * 特定日のスタッフの勤務時間を取得
 * Override > 通常スケジュール の優先順位
 */
export function getStaffWorkingHours(
  staff: StaffWithDetails,
  date: Date,
  dayOfWeek: number
): { startTime: string; endTime: string } | null {
  // まず Override をチェック
  const override = staff.scheduleOverrides.find((o) => {
    const oDate = new Date(o.date);
    return (
      oDate.getFullYear() === date.getFullYear() &&
      oDate.getMonth() === date.getMonth() &&
      oDate.getDate() === date.getDate()
    );
  });

  if (override) {
    // Override で startTime/endTime が null = 休み
    if (!override.startTime || !override.endTime) return null;
    return { startTime: override.startTime, endTime: override.endTime };
  }

  // 通常スケジュール
  const schedule = staff.schedules.find(
    (s) => s.dayOfWeek === dayOfWeek && s.isActive
  );
  if (!schedule) return null;
  return { startTime: schedule.startTime, endTime: schedule.endTime };
}

/**
 * スタッフがメニューに対応可能かチェック
 * menuAssignments が空 = 全メニュー対応
 */
export function canStaffHandleMenus(
  staff: StaffWithDetails,
  menuIds: string[]
): boolean {
  if (staff.menuAssignments.length === 0) return true;
  const assignedIds = new Set(staff.menuAssignments.map((a) => a.menuId));
  return menuIds.every((id) => assignedIds.has(id));
}

/**
 * 対応可能なスタッフ一覧を取得
 */
export async function getQualifiedStaff(
  date: Date,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  menuIds: string[]
): Promise<StaffWithDetails[]> {
  const startOfDay = parseLocalDateStart(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  );
  const endOfDay = parseLocalDateEnd(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  );

  const allStaff = await prisma.staff.findMany({
    where: { isActive: true },
    include: {
      schedules: { where: { isActive: true } },
      scheduleOverrides: {
        where: {
          date: { gte: startOfDay, lte: endOfDay },
        },
      },
      menuAssignments: { select: { menuId: true } },
    },
    orderBy: { displayOrder: "asc" },
  });

  return allStaff.filter((staff) => {
    // シフトチェック
    const hours = getStaffWorkingHours(staff, date, dayOfWeek);
    if (!hours) return false;
    if (startTime < hours.startTime || endTime > hours.endTime) return false;

    // メニュー対応チェック
    if (!canStaffHandleMenus(staff, menuIds)) return false;

    return true;
  });
}

/**
 * 自動割り当て: 最も予約が少ないスタッフに割り当て
 */
export async function autoAssignStaff(
  dateStr: string,
  date: Date,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  menuIds: string[]
): Promise<{ staffId: string; staffName: string } | null> {
  const qualifiedStaff = await getQualifiedStaff(
    date,
    dayOfWeek,
    startTime,
    endTime,
    menuIds
  );

  if (qualifiedStaff.length === 0) return null;

  const startOfDay = parseLocalDateStart(dateStr);
  const endOfDay = parseLocalDateEnd(dateStr);

  // 当日の既存予約を取得
  const existingReservations = await prisma.reservation.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      status: "CONFIRMED",
      staffId: { in: qualifiedStaff.map((s) => s.id) },
    },
    select: { staffId: true, startTime: true, endTime: true },
  });

  // 時間帯の重複がないスタッフに絞る
  const availableStaff = qualifiedStaff.filter((staff) => {
    const myReservations = existingReservations.filter(
      (r) => r.staffId === staff.id
    );
    return !myReservations.some(
      (r) => startTime < r.endTime && endTime > r.startTime
    );
  });

  if (availableStaff.length === 0) return null;

  // 予約件数が最少のスタッフを選択 (負荷分散)
  const staffWithCounts = availableStaff.map((staff) => ({
    staff,
    count: existingReservations.filter((r) => r.staffId === staff.id).length,
  }));

  staffWithCounts.sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count;
    return a.staff.displayOrder - b.staff.displayOrder;
  });

  const assigned = staffWithCounts[0].staff;
  return { staffId: assigned.id, staffName: assigned.name };
}
