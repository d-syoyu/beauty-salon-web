// src/lib/business-settings.ts

import { prisma } from "@/lib/db";

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export async function getClosedDays(): Promise<number[]> {
  const setting = await prisma.settings.findUnique({
    where: { key: "closed_days" },
  });
  return setting ? JSON.parse(setting.value) : [1];
}

export async function getClosedDaysText(): Promise<string> {
  const closedDays = await getClosedDays();
  if (closedDays.length === 0) {
    return "不定休";
  }
  const dayNames = closedDays.map(d => WEEKDAYS[d]).join('・');
  return `毎週${dayNames}曜日（不定休あり）`;
}

export async function getClosedDayNames(): Promise<string[]> {
  const closedDays = await getClosedDays();
  return closedDays.map(d => WEEKDAYS[d]);
}
