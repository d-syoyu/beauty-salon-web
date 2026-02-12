// src/lib/email.ts
// LUMINA HAIR STUDIO - Email utilities

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "LUMINA HAIR STUDIO <noreply@lumina-hair.jp>";

interface ReservationEmailData {
  customerName: string;
  date: string;
  startTime: string;
  endTime: string;
  menuSummary: string;
  totalPrice: number;
  reservationId: string;
}

export async function sendReservationConfirmationEmail(
  to: string,
  data: ReservationEmailData
) {
  if (!resend) {
    console.log("[Email] Resend not configured. Skipping email to:", to);
    return;
  }

  const html = `
    <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; background: #FDFCFA; padding: 40px 30px;">
      <h1 style="color: #1A1A1A; font-size: 24px; text-align: center; letter-spacing: 0.1em;">LUMINA HAIR STUDIO</h1>
      <div style="width: 40px; height: 1px; background: #B8956E; margin: 20px auto;"></div>
      <h2 style="color: #1A1A1A; font-size: 18px; text-align: center;">ご予約確認</h2>
      <p style="color: #5A5550;">${data.customerName} 様</p>
      <p style="color: #5A5550;">ご予約ありがとうございます。以下の内容でご予約を承りました。</p>
      <div style="background: white; border: 1px solid #E5E0DB; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>予約番号:</strong> ${data.reservationId}</p>
        <p style="margin: 8px 0;"><strong>日時:</strong> ${data.date} ${data.startTime}〜${data.endTime}</p>
        <p style="margin: 8px 0;"><strong>メニュー:</strong> ${data.menuSummary}</p>
        <p style="margin: 8px 0;"><strong>合計:</strong> ¥${data.totalPrice.toLocaleString()}</p>
      </div>
      <p style="color: #5A5550; font-size: 14px;">キャンセル・変更は前日19時までにお電話ください。</p>
      <p style="color: #5A5550; font-size: 14px;">TEL: 03-1234-5678</p>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E0DB;">
        <p style="color: #A89686; font-size: 12px;">LUMINA HAIR STUDIO<br>東京都渋谷区神宮前1-2-3</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "【LUMINA HAIR STUDIO】ご予約確認",
      html,
    });
  } catch (error) {
    console.error("[Email] Failed to send confirmation:", error);
  }
}

export async function sendAdminNewReservationEmail(data: ReservationEmailData) {
  if (!resend || !process.env.ADMIN_EMAIL) {
    console.log("[Email] Skipping admin notification");
    return;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>新規予約通知</h2>
      <p><strong>お客様:</strong> ${data.customerName}</p>
      <p><strong>日時:</strong> ${data.date} ${data.startTime}〜${data.endTime}</p>
      <p><strong>メニュー:</strong> ${data.menuSummary}</p>
      <p><strong>合計:</strong> ¥${data.totalPrice.toLocaleString()}</p>
      <p><strong>予約ID:</strong> ${data.reservationId}</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `新規予約: ${data.customerName} 様 - ${data.date} ${data.startTime}`,
      html,
    });
  } catch (error) {
    console.error("[Email] Failed to send admin notification:", error);
  }
}

export async function sendCancellationEmail(to: string, data: ReservationEmailData) {
  if (!resend) {
    console.log("[Email] Resend not configured. Skipping cancellation email.");
    return;
  }

  const html = `
    <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; background: #FDFCFA; padding: 40px 30px;">
      <h1 style="color: #1A1A1A; font-size: 24px; text-align: center; letter-spacing: 0.1em;">LUMINA HAIR STUDIO</h1>
      <div style="width: 40px; height: 1px; background: #B8956E; margin: 20px auto;"></div>
      <h2 style="color: #1A1A1A; font-size: 18px; text-align: center;">ご予約キャンセルのお知らせ</h2>
      <p style="color: #5A5550;">${data.customerName} 様</p>
      <p style="color: #5A5550;">以下のご予約をキャンセルいたしました。</p>
      <div style="background: white; border: 1px solid #E5E0DB; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>日時:</strong> ${data.date} ${data.startTime}〜${data.endTime}</p>
        <p style="margin: 8px 0;"><strong>メニュー:</strong> ${data.menuSummary}</p>
      </div>
      <p style="color: #5A5550; font-size: 14px;">またのご利用をお待ちしております。</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "【LUMINA HAIR STUDIO】ご予約キャンセルのお知らせ",
      html,
    });
  } catch (error) {
    console.error("[Email] Failed to send cancellation:", error);
  }
}

export function createNewsletterHtml(content: string, title: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; background: #FDFCFA; padding: 40px 30px;">
      <h1 style="color: #1A1A1A; font-size: 24px; text-align: center; letter-spacing: 0.1em;">LUMINA HAIR STUDIO</h1>
      <div style="width: 40px; height: 1px; background: #B8956E; margin: 20px auto;"></div>
      <h2 style="color: #1A1A1A; font-size: 20px;">${title}</h2>
      <div style="color: #5A5550; line-height: 1.8;">${content}</div>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E0DB;">
        <p style="color: #A89686; font-size: 12px;">LUMINA HAIR STUDIO<br>東京都渋谷区神宮前1-2-3</p>
      </div>
    </div>
  `;
}
