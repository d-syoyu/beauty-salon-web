// POST /api/admin/demo-reset - Reset database to demo state
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearDatabase, seedDatabase } from "@/lib/seed";

export async function POST() {
  try {
    await clearDatabase(prisma);
    await seedDatabase(prisma);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Demo reset error:", error);
    return NextResponse.json(
      { error: "リセットに失敗しました" },
      { status: 500 }
    );
  }
}
