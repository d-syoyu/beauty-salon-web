// src/app/api/admin/newsletter/send/route.ts
// Admin Newsletter Send API

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNewsletterHtml } from "@/lib/email";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "タイトルと本文は必須です" }, { status: 400 });
    }

    // Get opted-in customers with email
    const subscribers = await prisma.user.findMany({
      where: {
        email: { not: null },
        newsletterOptOut: false,
        role: "CUSTOMER",
      },
      select: { email: true, name: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json({ error: "配信先がありません" }, { status: 400 });
    }

    const html = createNewsletterHtml(content, title);

    if (!process.env.RESEND_API_KEY) {
      console.log(`[Newsletter] Would send to ${subscribers.length} subscribers`);
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: "メール設定が未完了のため、送信をスキップしました",
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    let sentCount = 0;

    for (const subscriber of subscribers) {
      if (!subscriber.email) continue;
      try {
        await resend.emails.send({
          from: "LUMINA HAIR STUDIO <noreply@lumina-hair.jp>",
          to: subscriber.email,
          subject: `【LUMINA HAIR STUDIO】${title}`,
          html,
        });
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send to ${subscriber.email}:`, emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalSubscribers: subscribers.length,
    });
  } catch (err) {
    console.error("Newsletter send error:", err);
    return NextResponse.json({ error: "ニュースレターの送信に失敗しました" }, { status: 500 });
  }
}
