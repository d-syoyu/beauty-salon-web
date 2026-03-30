// GET /api/cron/demo-reset - Daily scheduled demo data reset
// Triggered by Vercel Cron Jobs

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearDatabase, seedDatabase } from "@/lib/seed";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      const isAuthorized =
        authHeader === `Bearer ${CRON_SECRET}`;
      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("[cron/demo-reset] Starting daily demo reset...");
    await clearDatabase(prisma);
    await seedDatabase(prisma);
    console.log("[cron/demo-reset] Demo reset completed.");

    return NextResponse.json({ ok: true, resetAt: new Date().toISOString() });
  } catch (error) {
    console.error("[cron/demo-reset] Error:", error);
    return NextResponse.json(
      { error: "リセットに失敗しました" },
      { status: 500 }
    );
  }
}
