// prisma/seed-today.ts
// 今日の予約シードデータを挿入する

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayDate = new Date(dateStr + "T12:00:00");

  // 既存データ取得
  const customers = await prisma.user.findMany({ where: { role: "CUSTOMER" }, take: 6 });
  const menus = await prisma.menu.findMany({ include: { category: true } });
  const staffList = await prisma.staff.findMany({ where: { isActive: true } });

  if (customers.length === 0) throw new Error("顧客データがありません。先に db:seed を実行してください。");
  if (menus.length === 0) throw new Error("メニューデータがありません。");
  if (staffList.length === 0) throw new Error("スタッフデータがありません。");

  // 今日の予約をすべて削除してから再挿入
  await prisma.reservation.deleteMany({
    where: { date: todayDate },
  });

  const reservations = [
    { customer: 0, menuName: "カット",           startTime: "10:00", staff: 0 },
    { customer: 1, menuName: "フルカラー",         startTime: "11:00", staff: 1 },
    { customer: 2, menuName: "パーマ",            startTime: "13:00", staff: 0 },
    { customer: 3, menuName: "髪質改善トリートメント", startTime: "14:00", staff: 1 },
    { customer: 4, menuName: "カット + カラー",     startTime: "16:00", staff: 0 },
  ];

  for (const r of reservations) {
    const menu = menus.find((m) => m.name === r.menuName);
    if (!menu) { console.warn(`メニューが見つかりません: ${r.menuName}`); continue; }

    const [sh, sm] = r.startTime.split(":").map(Number);
    const endMin = sh * 60 + sm + menu.duration;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    const staff = staffList[r.staff % staffList.length];
    const customer = customers[r.customer % customers.length];

    await prisma.reservation.create({
      data: {
        userId: customer.id,
        totalPrice: menu.price,
        totalDuration: menu.duration,
        menuSummary: menu.name,
        date: todayDate,
        startTime: r.startTime,
        endTime,
        status: "CONFIRMED",
        staffId: staff.id,
        staffName: staff.name,
        items: {
          create: {
            menuId: menu.id,
            menuName: menu.name,
            category: menu.category.name,
            price: menu.price,
            duration: menu.duration,
            orderIndex: 0,
          },
        },
      },
    });
    console.log(`✅ ${r.startTime}〜${endTime} ${customer.name} / ${menu.name} (${staff.name})`);
  }

  console.log(`\n🌱 今日(${dateStr})の予約シード完了: ${reservations.length}件`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
