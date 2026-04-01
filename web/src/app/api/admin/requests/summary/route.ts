import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const [corrections, leaveRequests, overtimeRequests] = await Promise.all([
      prisma.attendanceCorrectionRequest.count({
        where: { status: "submitted" },
      }),
      prisma.leaveRequest.count({
        where: { status: "submitted" },
      }),
      prisma.overtimeRequest.count({
        where: { status: "submitted" },
      }),
    ]);

    return NextResponse.json({
      submittedCount: corrections + leaveRequests + overtimeRequests,
      corrections,
      leaveRequests,
      overtimeRequests,
    });
  } catch (err) {
    console.error("Request summary error:", err);
    return NextResponse.json(
      { error: "Failed to load request summary." },
      { status: 500 }
    );
  }
}
