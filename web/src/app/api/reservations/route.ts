// src/app/api/reservations/route.ts
// LUMINA HAIR STUDIO - Reservations API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createReservationSchema } from "@/lib/validations";
import { getBusinessHours } from "@/constants/salon";
import { isWithinBookingWindow, calculateEndTime } from "@/constants/booking";
import { parseLocalDate, parseLocalDateStart, parseLocalDateEnd } from "@/lib/date-utils";
import { validateCoupon } from "@/lib/coupon-validation";
import { getClosedDays } from "@/lib/business-settings";
import { autoAssignStaff, getStaffWorkingHours, canStaffHandleMenus } from "@/lib/staff-assignment";

// DB Menu type
interface DbMenu {
  id: string;
  name: string;
  price: number;
  duration: number;
  lastBookingTime: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

// GET /api/reservations - List reservations (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    // Date filtering
    const date = searchParams.get("date");
    const month = searchParams.get("month"); // YYYY-MM format
    if (date) {
      const targetDate = parseLocalDateStart(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      where.date = {
        gte: targetDate,
        lt: nextDate,
      };
    } else if (month) {
      const [year, m] = month.split("-").map(Number);
      const startOfMonth = new Date(year, m - 1, 1);
      const endOfMonth = new Date(year, m, 1);
      where.date = {
        gte: startOfMonth,
        lt: endOfMonth,
      };
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          coupon: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              value: true,
            },
          },
          staff: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          items: {
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    return NextResponse.json({
      reservations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get reservations error:", error);
    return NextResponse.json(
      { error: "予約一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/reservations - Create guest reservation (NO auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createReservationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      menuIds,
      date: dateStr,
      startTime,
      note,
      couponCode,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      stripePaymentIntentId,
      staffId: requestedStaffId,
    } = validationResult.data;

    // Fetch menus from DB
    const menus = (await prisma.menu.findMany({
      where: {
        id: { in: menuIds },
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })) as DbMenu[];

    // Verify all menus exist
    if (menus.length !== menuIds.length) {
      return NextResponse.json(
        { error: "指定されたメニューが見つかりません" },
        { status: 400 }
      );
    }

    // Parse the date
    const date = parseLocalDate(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "日付の形式が正しくありません" },
        { status: 400 }
      );
    }

    // Check regular closed days
    const closedDays = await getClosedDays();
    if (closedDays.includes(date.getDay())) {
      return NextResponse.json(
        { error: "申し訳ございません。定休日のため予約できません" },
        { status: 400 }
      );
    }

    // Check booking window
    if (!isWithinBookingWindow(date)) {
      return NextResponse.json(
        { error: "この日付は予約できません" },
        { status: 400 }
      );
    }

    // Check irregular holidays (all-day only; time-range blocks handled by availability API)
    const startOfDay = parseLocalDateStart(dateStr);
    const endOfDay = parseLocalDateEnd(dateStr);

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    for (const holiday of holidays) {
      if (!holiday.startTime || !holiday.endTime) {
        return NextResponse.json(
          {
            error: `申し訳ございません。この日は休業日です${
              holiday.reason ? `（${holiday.reason}）` : ""
            }`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate totals from DB menus
    const totalPrice = menus.reduce((sum, menu) => sum + menu.price, 0);
    const totalDuration = menus.reduce((sum, menu) => sum + menu.duration, 0);
    const menuSummary = menus.map((m) => m.name).join("、");

    // Get business hours for this date
    const businessHours = getBusinessHours(date);

    // Check last booking time
    if (startTime > businessHours.lastBooking) {
      return NextResponse.json(
        { error: `最終受付は${businessHours.lastBooking}です` },
        { status: 400 }
      );
    }

    // Calculate end time
    const endTime = calculateEndTime(startTime, totalDuration);
    const weekday = date.getDay();

    // Validate coupon (optional)
    let appliedCouponId: string | null = null;
    let appliedCouponCode: string | null = null;
    let appliedCouponDiscount = 0;

    if (couponCode) {
      const couponResult = await validateCoupon({
        code: couponCode,
        subtotal: totalPrice,
        customerId: null,
        menuIds,
        categories: menus.map((m) => m.categoryId),
        weekday,
        time: startTime,
        menuItems: menus.map((m) => ({
          menuId: m.id,
          categoryId: m.categoryId,
          price: m.price,
        })),
      });

      if (!couponResult.valid) {
        return NextResponse.json(
          { error: couponResult.error },
          { status: 400 }
        );
      }

      appliedCouponId = couponResult.coupon.id;
      appliedCouponCode = couponResult.coupon.code;
      appliedCouponDiscount = couponResult.discountAmount;
    }

    // Check business hours (open/close)
    if (startTime < businessHours.open) {
      return NextResponse.json(
        { error: "営業時間外のため予約できません" },
        { status: 400 }
      );
    }
    if (endTime > businessHours.close) {
      return NextResponse.json(
        { error: "営業時間外のため予約できません" },
        { status: 400 }
      );
    }

    // Staff assignment
    let assignedStaffId: string | null = null;
    let assignedStaffName: string | null = null;

    const dayOfWeek = date.getDay();

    if (requestedStaffId) {
      // Specific stylist requested - validate
      const staff = await prisma.staff.findUnique({
        where: { id: requestedStaffId, isActive: true },
        include: {
          schedules: { where: { isActive: true } },
          scheduleOverrides: {
            where: { date: { gte: startOfDay, lte: endOfDay } },
          },
          menuAssignments: { select: { menuId: true } },
        },
      });

      if (!staff) {
        return NextResponse.json(
          { error: "指定されたスタイリストが見つかりません" },
          { status: 400 }
        );
      }

      // Check menu compatibility
      if (!canStaffHandleMenus(staff, menuIds)) {
        return NextResponse.json(
          { error: "このスタイリストは選択されたメニューに対応していません" },
          { status: 400 }
        );
      }

      // Check shift
      const hours = getStaffWorkingHours(staff, date, dayOfWeek);
      if (!hours || startTime < hours.startTime || endTime > hours.endTime) {
        return NextResponse.json(
          { error: "このスタイリストはこの時間帯に勤務していません" },
          { status: 400 }
        );
      }

      // Check conflicts for this staff only
      const staffReservations = await prisma.reservation.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: "CONFIRMED",
          staffId: requestedStaffId,
        },
        select: { startTime: true, endTime: true },
      });

      const hasConflict = staffReservations.some(
        (r) => startTime < r.endTime && endTime > r.startTime
      );
      if (hasConflict) {
        return NextResponse.json(
          { error: "申し訳ございません。このスタイリストはこの時間帯に既に予約が入っています" },
          { status: 409 }
        );
      }

      assignedStaffId = staff.id;
      assignedStaffName = staff.name;
    } else {
      // Auto-assign: find available qualified staff
      const result = await autoAssignStaff(
        dateStr,
        date,
        dayOfWeek,
        startTime,
        endTime,
        menuIds
      );

      if (!result) {
        return NextResponse.json(
          { error: "申し訳ございません。この時間帯は全スタイリストの予約が埋まっています" },
          { status: 409 }
        );
      }

      assignedStaffId = result.staffId;
      assignedStaffName = result.staffName;
    }

    // Create reservation in a transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // Find existing user by phone, or create a new one
      let user = await tx.user.findFirst({
        where: { phone: customerPhone },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail || null,
            role: "CUSTOMER",
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            name: customerName,
            ...(customerEmail ? { email: customerEmail } : {}),
          },
        });
      }

      // Create reservation with staff assignment
      const newReservation = await tx.reservation.create({
        data: {
          userId: user.id,
          totalPrice,
          totalDuration,
          menuSummary,
          couponId: appliedCouponId,
          couponCode: appliedCouponCode,
          couponDiscount: appliedCouponDiscount,
          date: parseLocalDate(dateStr),
          startTime,
          endTime,
          note: note || null,
          status: "CONFIRMED",
          paymentMethod: paymentMethod || "ONSITE",
          stripePaymentIntentId: stripePaymentIntentId || null,
          staffId: assignedStaffId,
          staffName: assignedStaffName,
        },
      });

      await tx.reservationItem.createMany({
        data: menus.map((menu, index) => ({
          reservationId: newReservation.id,
          menuId: menu.id,
          menuName: menu.name,
          category: menu.category.name,
          price: menu.price,
          duration: menu.duration,
          orderIndex: index,
        })),
      });

      return tx.reservation.findUnique({
        where: { id: newReservation.id },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          coupon: {
            select: { id: true, code: true, name: true, type: true, value: true },
          },
          staff: {
            select: { id: true, name: true, image: true },
          },
          items: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: "予約が完了しました",
        reservation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create reservation error:", error);
    return NextResponse.json(
      { error: "予約の作成に失敗しました" },
      { status: 500 }
    );
  }
}
