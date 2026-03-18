import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { approveRequest } from "@/lib/workforce-requests";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await checkAdminAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const requestType = body.requestType as string | undefined;
    if (!requestType) {
      return NextResponse.json({ error: "requestType is required." }, { status: 400 });
    }

    const updated = await prisma.$transaction((tx) =>
      approveRequest(tx, `${requestType}__${id}`, user?.id, body.comment)
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Request approve error:", err);
    return NextResponse.json({ error: "Failed to approve request." }, { status: 500 });
  }
}
