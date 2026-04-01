import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;

    const customer = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const reservations = await prisma.reservation.findMany({
      where: { userId: id },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        totalPrice: true,
        totalDuration: true,
        menuSummary: true,
        status: true,
        items: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            menuName: true,
            category: true,
            price: true,
            duration: true,
          },
        },
      },
    });

    return NextResponse.json(
      reservations.map((reservation) => ({
        ...reservation,
        date:
          reservation.date instanceof Date
            ? reservation.date.toISOString()
            : String(reservation.date),
      }))
    );
  } catch (err) {
    console.error("Customer reservations error:", err);
    return NextResponse.json(
      { error: "Failed to load customer reservations." },
      { status: 500 }
    );
  }
}
