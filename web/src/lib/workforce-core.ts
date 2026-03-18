import { formatLocalDate } from "@/lib/date-utils";

export const SHIFT_STATUSES = ["scheduled", "off", "leave", "published", "draft"] as const;
export const ATTENDANCE_STATUSES = [
  "not_started",
  "working",
  "on_break",
  "completed",
  "absent",
  "late",
  "early_leave",
  "overtime",
] as const;
export const APPROVAL_STATUSES = ["draft", "submitted", "approved", "rejected", "cancelled"] as const;
export const LEAVE_UNITS = ["full", "half_am", "half_pm", "hours"] as const;

export type ShiftStatus = (typeof SHIFT_STATUSES)[number];
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type LeaveUnit = (typeof LEAVE_UNITS)[number];

export interface ShiftLike {
  startTime: string | null;
  endTime: string | null;
  breakMinutes?: number | null;
  status?: string | null;
  note?: string | null;
  source?: string | null;
  isOverride?: boolean;
}

export interface LeaveLike {
  date: Date | string;
  status: string;
  unit: string;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}

export interface OvertimeLike {
  date: Date | string;
  status: string;
  requestedStartTime?: string | null;
  requestedEndTime: string;
  note?: string | null;
  isHolidayWork?: boolean;
}

export interface ScheduleLike {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface ShiftSubjectLike {
  schedules: ScheduleLike[];
  scheduleOverrides?: ShiftLikeWithDate[];
  leaveRequests?: LeaveLike[];
  overtimeRequests?: OvertimeLike[];
}

export interface ShiftLikeWithDate extends ShiftLike {
  date: Date | string;
  patternCode?: string | null;
}

export interface EffectiveShift {
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number;
  status: ShiftStatus;
  note?: string | null;
  source: string;
  isOverride: boolean;
}

export interface AttendanceMetrics {
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
}

export function toTimeMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function fromTimeMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function diffMinutes(startTime: string | null | undefined, endTime: string | null | undefined): number {
  const start = toTimeMinutes(startTime);
  const end = toTimeMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  return end - start;
}

export function isSameLocalDate(left: Date | string, right: Date | string): boolean {
  const leftDate = typeof left === "string" ? new Date(left) : left;
  const rightDate = typeof right === "string" ? new Date(right) : right;
  return formatLocalDate(leftDate) === formatLocalDate(rightDate);
}

function pickBaseShift(subject: ShiftSubjectLike, date: Date): EffectiveShift | null {
  const override = subject.scheduleOverrides?.find((item) => isSameLocalDate(item.date, date));
  if (override) {
    if (!override.startTime || !override.endTime) {
      return {
        isWorking: false,
        startTime: null,
        endTime: null,
        breakMinutes: override.breakMinutes ?? 0,
        status: (override.status as ShiftStatus) || "off",
        note: override.note,
        source: override.source || "override",
        isOverride: true,
      };
    }
    return {
      isWorking: true,
      startTime: override.startTime,
      endTime: override.endTime,
      breakMinutes: override.breakMinutes ?? 0,
      status: ((override.status as ShiftStatus) || "scheduled"),
      note: override.note,
      source: override.source || "override",
      isOverride: true,
    };
  }

  const schedule = subject.schedules.find((item) => item.dayOfWeek === date.getDay() && item.isActive);
  if (!schedule) return null;
  return {
    isWorking: true,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    breakMinutes: 0,
    status: "scheduled",
    source: "weekly_schedule",
    isOverride: false,
  };
}

function applyPartialLeave(baseShift: EffectiveShift, leaveRequest: LeaveLike): EffectiveShift {
  if (!baseShift.startTime || !baseShift.endTime) {
    return baseShift;
  }

  const start = toTimeMinutes(baseShift.startTime) ?? 0;
  const end = toTimeMinutes(baseShift.endTime) ?? 0;
  let nextStart = start;
  let nextEnd = end;

  if (leaveRequest.unit === "half_am") {
    nextStart = Math.max(start, 13 * 60);
  } else if (leaveRequest.unit === "half_pm") {
    nextEnd = Math.min(end, 13 * 60);
  } else if (leaveRequest.unit === "hours") {
    const leaveStart = toTimeMinutes(leaveRequest.startTime);
    const leaveEnd = toTimeMinutes(leaveRequest.endTime);
    if (leaveStart !== null && leaveEnd !== null) {
      if (leaveStart <= start && leaveEnd >= end) {
        return { ...baseShift, isWorking: false, startTime: null, endTime: null, status: "leave", source: "leave_request" };
      }
      if (leaveStart <= start && leaveEnd < end) {
        nextStart = Math.max(nextStart, leaveEnd);
      } else if (leaveStart > start && leaveEnd >= end) {
        nextEnd = Math.min(nextEnd, leaveStart);
      } else if (leaveStart > start && leaveEnd < end) {
        nextEnd = leaveStart;
      }
    }
  }

  if (nextEnd <= nextStart) {
    return { ...baseShift, isWorking: false, startTime: null, endTime: null, status: "leave", source: "leave_request" };
  }

  return {
    ...baseShift,
    startTime: fromTimeMinutes(nextStart),
    endTime: fromTimeMinutes(nextEnd),
    status: "leave",
    source: "leave_request",
    note: leaveRequest.note || baseShift.note,
  };
}

export function getEffectiveShift(subject: ShiftSubjectLike, date: Date): EffectiveShift | null {
  let baseShift = pickBaseShift(subject, date);

  const approvedLeave = subject.leaveRequests?.find(
    (item) => item.status === "approved" && isSameLocalDate(item.date, date)
  );
  if (approvedLeave) {
    if (approvedLeave.unit === "full") {
      return {
        isWorking: false,
        startTime: null,
        endTime: null,
        breakMinutes: 0,
        status: "leave",
        note: approvedLeave.note,
        source: "leave_request",
        isOverride: true,
      };
    }
    if (baseShift) {
      baseShift = applyPartialLeave(baseShift, approvedLeave);
    }
  }

  const approvedOvertime = subject.overtimeRequests?.find(
    (item) => item.status === "approved" && isSameLocalDate(item.date, date)
  );
  if (approvedOvertime) {
    if (!baseShift && approvedOvertime.isHolidayWork) {
      return {
        isWorking: true,
        startTime: approvedOvertime.requestedStartTime || "10:00",
        endTime: approvedOvertime.requestedEndTime,
        breakMinutes: 0,
        status: "scheduled",
        note: approvedOvertime.note,
        source: "overtime_request",
        isOverride: true,
      };
    }
    if (baseShift?.isWorking) {
      baseShift = {
        ...baseShift,
        startTime: approvedOvertime.requestedStartTime || baseShift.startTime,
        endTime: approvedOvertime.requestedEndTime,
        source: "overtime_request",
        isOverride: true,
      };
    }
  }

  return baseShift;
}

export function deriveAttendanceMetrics(params: {
  shift: EffectiveShift | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  totalBreakMinutes?: number;
}): AttendanceMetrics {
  const totalBreakMinutes = params.totalBreakMinutes ?? 0;
  const totalMinutes = Math.max(diffMinutes(params.actualStartTime, params.actualEndTime) - totalBreakMinutes, 0);

  if (!params.actualStartTime) {
    return {
      totalWorkMinutes: 0,
      totalBreakMinutes,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      status: "not_started",
    };
  }

  if (params.actualStartTime && !params.actualEndTime) {
    const lateMinutes = Math.max(
      (toTimeMinutes(params.actualStartTime) ?? 0) - (toTimeMinutes(params.shift?.startTime) ?? 0),
      0
    );
    return {
      totalWorkMinutes: totalMinutes,
      totalBreakMinutes,
      lateMinutes,
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      status: lateMinutes > 0 ? "late" : "working",
    };
  }

  const lateMinutes = Math.max(
    (toTimeMinutes(params.actualStartTime) ?? 0) - (toTimeMinutes(params.shift?.startTime) ?? 0),
    0
  );
  const earlyLeaveMinutes = Math.max(
    (toTimeMinutes(params.shift?.endTime) ?? 0) - (toTimeMinutes(params.actualEndTime) ?? 0),
    0
  );
  const overtimeMinutes = Math.max(
    (toTimeMinutes(params.actualEndTime) ?? 0) - (toTimeMinutes(params.shift?.endTime) ?? 0),
    0
  );

  let status: AttendanceStatus = "completed";
  if (overtimeMinutes > 0) status = "overtime";
  else if (earlyLeaveMinutes > 0) status = "early_leave";
  else if (lateMinutes > 0) status = "late";

  return {
    totalWorkMinutes: totalMinutes,
    totalBreakMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes,
    status,
  };
}

export function getJapanStatutoryLeaveDays(yearIndex: number): number {
  if (yearIndex <= 0) return 10;
  if (yearIndex === 1) return 11;
  if (yearIndex === 2) return 12;
  if (yearIndex === 3) return 14;
  if (yearIndex === 4) return 16;
  if (yearIndex === 5) return 18;
  return 20;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function getLeaveGrantSchedule(hireDate: Date, today: Date): Date[] {
  const grants: Date[] = [];
  for (let step = 0; step < 7; step += 1) {
    const target = addMonths(hireDate, step === 0 ? 6 : 18 + (step - 1) * 12);
    if (target <= today) grants.push(target);
  }
  return grants;
}
