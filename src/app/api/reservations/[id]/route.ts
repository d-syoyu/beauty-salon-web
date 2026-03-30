// src/app/api/reservations/[id]/route.ts
// LUMINA HAIR STUDIO - Individual Reservation API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canCancelReservation } from "@/constants/booking";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/reservations/[id] - Fetch reservation by ID with items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
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
        items: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error("Get reservation error:", error);
    return NextResponse.json(
      { error: "予約情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PATCH /api/reservations/[id] - Cancel reservation (check cancellation policy)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== "cancel") {
      return NextResponse.json(
        { error: "無効なアクションです。'cancel' を指定してください" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 }
      );
    }

    // Already cancelled
    if (reservation.status === "CANCELLED") {
      return NextResponse.json(
        { error: "この予約は既にキャンセルされています" },
        { status: 400 }
      );
    }

    // Already completed
    if (reservation.status === "COMPLETED") {
      return NextResponse.json(
        { error: "完了済みの予約はキャンセルできません" },
        { status: 400 }
      );
    }

    // Check cancellation deadline (1 day before at 19:00)
    if (!canCancelReservation(reservation.date)) {
      return NextResponse.json(
        {
          error:
            "キャンセル期限を過ぎています。お電話でお問い合わせください。",
        },
        { status: 400 }
      );
    }

    // Perform cancellation
    const cancelledReservation = await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json({
      message: "予約をキャンセルしました",
      reservation: cancelledReservation,
    });
  } catch (error) {
    console.error("Cancel reservation error:", error);
    return NextResponse.json(
      { error: "予約のキャンセルに失敗しました" },
      { status: 500 }
    );
  }
}
