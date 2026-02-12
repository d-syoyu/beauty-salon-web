// src/lib/validations.ts
// LUMINA - Zod Validation Schemas

import { z } from "zod";

export const createReservationSchema = z.object({
  menuIds: z.array(z.string()).min(1, "メニューを選択してください"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "時間の形式が正しくありません"),
  note: z.string().max(500, "備考は500文字以内で入力してください").optional(),
  couponCode: z.string().max(50).optional(),
  customerName: z.string().min(1, "お名前を入力してください").max(100),
  customerPhone: z.string().min(1, "電話番号を入力してください").max(20),
  customerEmail: z.string().email("メールアドレスの形式が正しくありません").optional(),
  paymentMethod: z.enum(["ONLINE", "ONSITE"]).default("ONSITE"),
  stripePaymentIntentId: z.string().optional(),
});

export const cancelReservationSchema = z.object({
  id: z.string().min(1, "予約IDが必要です"),
});

export const contactSchema = z.object({
  name: z.string().min(1, "お名前を入力してください").max(100),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  phone: z.string().optional(),
  message: z.string().min(1, "お問い合わせ内容を入力してください").max(2000),
});

export const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
});

export const monthQuerySchema = z.object({
  year: z.coerce.number().min(2024).max(2100),
  month: z.coerce.number().min(1).max(12),
});
