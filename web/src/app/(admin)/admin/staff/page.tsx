// src/app/(admin)/admin/staff/page.tsx
// RSC: fetches staff day-ops and pending request count via Prisma utilities

import { prisma } from '@/lib/db';
import { formatLocalDate, parseLocalDateEnd, parseLocalDateStart } from '@/lib/date-utils';
import {
  buildTodayOpsRow,
  getLeaveBalancesForAll,
  loadStaffShiftSubjects,
} from '@/lib/workforce-server';
import { listUnifiedRequests } from '@/lib/workforce-requests';
import StaffDayOpsClient from './StaffDayOpsClient';

function getJstTodayStr(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default async function StaffHomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const dateStr = dateParam || getJstTodayStr();
  const date = new Date(`${dateStr}T12:00:00`);
  const start = parseLocalDateStart(dateStr);
  const end = parseLocalDateEnd(dateStr);

  const [staff, reservations, submittedLeaveRequests, submittedOvertimeRequests, allRequests] =
    await Promise.all([
      loadStaffShiftSubjects(prisma, dateStr),
      prisma.reservation.findMany({
        where: { date: { gte: start, lte: end }, status: 'CONFIRMED' },
        select: { staffId: true, startTime: true, endTime: true },
      }),
      prisma.leaveRequest.findMany({
        where: { date: { gte: start, lte: end }, status: 'submitted' },
        select: { staffId: true },
      }),
      prisma.overtimeRequest.findMany({
        where: { date: { gte: start, lte: end }, status: 'submitted' },
        select: { staffId: true },
      }),
      listUnifiedRequests(),
    ]);

  const reservationCounts = new Map<string, number>();
  const pendingCounts = new Map<string, number>();

  for (const r of reservations) {
    if (!r.staffId) continue;
    reservationCounts.set(r.staffId, (reservationCounts.get(r.staffId) || 0) + 1);
  }
  for (const r of submittedLeaveRequests) {
    pendingCounts.set(r.staffId, (pendingCounts.get(r.staffId) || 0) + 1);
  }
  for (const r of submittedOvertimeRequests) {
    pendingCounts.set(r.staffId, (pendingCounts.get(r.staffId) || 0) + 1);
  }

  const leaveBalances = await getLeaveBalancesForAll(prisma, staff.map((m) => m.id));

  const rows = staff.map((member) => {
    const baseRow = buildTodayOpsRow(member, date);
    return {
      ...baseRow,
      reservationCount: reservationCounts.get(member.id) || 0,
      pendingRequestCount: baseRow.pendingRequestCount + (pendingCounts.get(member.id) || 0),
      leaveBalance: leaveBalances[member.id] ?? { remaining: 0 },
    };
  });

  const summary = {
    scheduledCount: rows.filter((r) => r.shift?.isWorking).length,
    clockedInCount: rows.filter((r) => r.attendance?.actualStartTime && !r.attendance?.actualEndTime).length,
    onBreakCount: rows.filter((r) => r.activeBreak).length,
    completedCount: rows.filter((r) => r.attendance?.actualEndTime).length,
    alertCount: rows.filter(
      (r) =>
        r.pendingRequestCount > 0 ||
        !!(r as { employmentWarning?: unknown }).employmentWarning ||
        r.attendance?.status === 'late' ||
        r.attendance?.status === 'overtime'
    ).length,
  };

  const pendingRequestCount = allRequests.filter((r) => r.status === 'submitted').length;

  return (
    <StaffDayOpsClient
      initialDate={dateStr}
      initialDayOps={{ summary, rows }}
      pendingRequestCount={pendingRequestCount}
    />
  );
}
