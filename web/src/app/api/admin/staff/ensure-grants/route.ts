import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { ensureAutoLeaveGrants } from "@/lib/workforce-server";

export async function POST() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    await ensureAutoLeaveGrants();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ensure-grants error:", err);
    return NextResponse.json({ error: "Failed to ensure leave grants." }, { status: 500 });
  }
}
