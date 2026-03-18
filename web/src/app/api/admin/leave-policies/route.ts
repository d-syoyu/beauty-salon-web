import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureAutoLeaveGrants, ensureDefaultWorkforceSetup } from "@/lib/workforce-server";

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    await ensureDefaultWorkforceSetup();
    const [policies, leaveTypes] = await Promise.all([
      prisma.leavePolicy.findMany({
        orderBy: { createdAt: "asc" },
      }),
      prisma.leaveType.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return NextResponse.json({ policies, leaveTypes });
  } catch (err) {
    console.error("Leave policy load error:", err);
    return NextResponse.json({ error: "Failed to load leave policies." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const policy = await prisma.leavePolicy.upsert({
      where: { id: body.id || "default-leave-policy" },
      update: {
        name: body.name,
        grantMode: body.grantMode || "hire_date",
        fixedGrantMonth: body.fixedGrantMonth ?? null,
        fixedGrantDay: body.fixedGrantDay ?? null,
        isActive: body.isActive ?? true,
        notes: body.notes ?? null,
      },
      create: {
        id: body.id || undefined,
        name: body.name || "Default Annual Leave Policy",
        grantMode: body.grantMode || "hire_date",
        fixedGrantMonth: body.fixedGrantMonth ?? null,
        fixedGrantDay: body.fixedGrantDay ?? null,
        isActive: body.isActive ?? true,
        notes: body.notes ?? null,
      },
    });

    await ensureAutoLeaveGrants();
    return NextResponse.json(policy);
  } catch (err) {
    console.error("Leave policy save error:", err);
    return NextResponse.json({ error: "Failed to save leave policy." }, { status: 500 });
  }
}
