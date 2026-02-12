// src/app/api/availability/route.ts
// LUMINA HAIR STUDIO - Availability API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBusinessHours } from "@/constants/salon";
import {
  generateTimeSlots,
  isWithinBookingWindow,
} from "@/constants/booking";
import { getClosedDays } from "@/lib/business-settings";
import { parseLocalDateStart, parseLocalDateEnd } from "@/lib/date-utils";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AvailabilityResponse {
  date: string;
  dayOfWeek: number;
  isClosed: boolean;
  slots: TimeSlot[];
  totalDuration?: number;
  totalPrice?: number;
}

// GET /api/availability?date=2026-01-15&menuIds=id1,id2
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get("date");
    const menuIdsParam = searchParams.get("menuIds");

    if (!dateStr) {
      return NextResponse.json(
        { error: "日付を指定してください" },
        { status: 400 }
      );
    }

    // Parse the date - use noon to prevent UTC date shift
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "日付の形式が正しくありません" },
        { status: 400 }
      );
    }

    const dayOfWeek = date.getDay();

    // Check regular closed days (from DB settings, default Monday)
    const closedDays = await getClosedDays();
    const isClosedDay = closedDays.includes(dayOfWeek);

    const startOfDay = parseLocalDateStart(dateStr);
    const endOfDay = parseLocalDateEnd(dateStr);

    // Check for special open days (override closed days)
    if (isClosedDay) {
      const specialOpenDays = await prisma.specialOpenDay.findMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (specialOpenDays.length === 0) {
        return NextResponse.json<AvailabilityResponse>({
          date: dateStr,
          dayOfWeek,
          isClosed: true,
          slots: [],
        });
      }
      // If there's a special open day, continue to generate slots
    }

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // If there is an all-day holiday (startTime and endTime are null), fully closed
    const hasAllDayHoliday = holidays.some((h) => !h.startTime && !h.endTime);
    if (hasAllDayHoliday) {
      return NextResponse.json<AvailabilityResponse>({
        date: dateStr,
        dayOfWeek,
        isClosed: true,
        slots: [],
      });
    }

    // Time-range holidays (partial closures)
    const timeRangeHolidays = holidays.filter(
      (h) => h.startTime && h.endTime
    );

    // Check if date is within the booking window
    if (!isWithinBookingWindow(date)) {
      return NextResponse.json<AvailabilityResponse>({
        date: dateStr,
        dayOfWeek,
        isClosed: false,
        slots: [],
      });
    }

    // Fetch menu information (multi-menu support)
    let totalDuration = 60;
    let totalPrice = 0;

    // Get business hours for this date (weekday vs weekend/holiday)
    const businessHours = getBusinessHours(date);

    // Last booking time defaults to the business hours setting
    const earliestLastBookingTime: string = businessHours.lastBooking;

    if (menuIdsParam) {
      const menuIds = menuIdsParam.split(",").filter(Boolean);

      const menus = await prisma.menu.findMany({
        where: {
          id: { in: menuIds },
          isActive: true,
        },
        select: {
          id: true,
          price: true,
          duration: true,
          lastBookingTime: true,
        },
      });

      // Verify all requested menus exist
      if (menus.length !== menuIds.length) {
        const foundIds = new Set(menus.map((m) => m.id));
        const invalidMenuId = menuIds.find((id) => !foundIds.has(id));
        return NextResponse.json(
          { error: `指定されたメニューが見つかりません: ${invalidMenuId}` },
          { status: 400 }
        );
      }

      // Calculate totals from DB menus
      totalDuration = menus.reduce((sum, menu) => sum + menu.duration, 0);
      totalPrice = menus.reduce((sum, menu) => sum + menu.price, 0);
    }

    // Fetch existing reservations for this day
    const existingReservations = await prisma.reservation.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: "CONFIRMED",
      },
      select: {
        startTime: true,
        endTime: true,
        totalDuration: true,
      },
    });

    // Generate time slots
    const allSlots = generateTimeSlots();

    // Current time check (for today)
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    // Filter slots to only include those after opening time
    const filteredSlots = allSlots.filter(
      (slotTime) => slotTime >= businessHours.open
    );

    const slots: TimeSlot[] = filteredSlots.map((slotTime) => {
      // 1. Check against last booking time (highest priority)
      if (slotTime > earliestLastBookingTime) {
        return { time: slotTime, available: false };
      }

      // 2. If today, exclude past time slots
      if (isToday) {
        const [hours, minutes] = slotTime.split(":").map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(hours, minutes, 0, 0);
        if (slotDate <= now) {
          return { time: slotTime, available: false };
        }
      }

      // 3. Calculate service end time
      const [startHours, startMinutes] = slotTime.split(":").map(Number);
      const endMinutes = startHours * 60 + startMinutes + totalDuration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
        .toString()
        .padStart(2, "0")}`;

      // 4. Check if service would end after closing time
      if (endTime > businessHours.close) {
        return { time: slotTime, available: false };
      }

      // 5. Check for conflicts with existing reservations
      const hasConflict = existingReservations.some((reservation) => {
        const resStart = reservation.startTime;
        const resEnd = reservation.endTime;
        return slotTime < resEnd && endTime > resStart;
      });

      // 6. Check for conflicts with time-range holidays
      const hasHolidayConflict = timeRangeHolidays.some((holiday) => {
        const holidayStart = holiday.startTime!;
        const holidayEnd = holiday.endTime!;
        return slotTime < holidayEnd && endTime > holidayStart;
      });

      return { time: slotTime, available: !hasConflict && !hasHolidayConflict };
    });

    return NextResponse.json<AvailabilityResponse>({
      date: dateStr,
      dayOfWeek,
      isClosed: false,
      slots,
      totalDuration,
      totalPrice,
    });
  } catch (error) {
    console.error("Availability API error:", error);
    return NextResponse.json(
      { error: "空き状況の取得に失敗しました" },
      { status: 500 }
    );
  }
}
