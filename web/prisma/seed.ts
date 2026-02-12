// prisma/seed.ts
// LUMINA HAIR STUDIO - Seed Data

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // 管理者ユーザー
  const hashedPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@lumina-hair.jp" },
    update: {},
    create: {
      email: "admin@lumina-hair.jp",
      name: "管理者",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // カテゴリ
  const categories = [
    { name: "カット", nameEn: "Cut", color: "#6B8E6B", displayOrder: 1 },
    { name: "カラー", nameEn: "Color", color: "#9F86C0", displayOrder: 2 },
    { name: "パーマ", nameEn: "Perm", color: "#E0B1CB", displayOrder: 3 },
    { name: "縮毛矯正", nameEn: "Straightening", color: "#B8956E", displayOrder: 4 },
    { name: "髪質改善", nameEn: "Hair Improvement", color: "#2A9D8F", displayOrder: 5 },
    { name: "トリートメント", nameEn: "Treatment", color: "#98C1D9", displayOrder: 6 },
    { name: "ヘッドスパ", nameEn: "Head Spa", color: "#A89686", displayOrder: 7 },
    { name: "ヘアセット", nameEn: "Hair Arrange", color: "#C8B6A6", displayOrder: 8 },
    { name: "セットメニュー", nameEn: "Set Menu", color: "#5A5550", displayOrder: 9 },
    { name: "店販商品", nameEn: "Products", color: "#D4A574", displayOrder: 10 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { ...cat },
      create: cat,
    });
    categoryMap[cat.name] = created.id;
  }

  // メニューアイテム
  const menus = [
    // カット
    { name: "カット", category: "カット", price: 5500, duration: 60, lastBookingTime: "19:00", displayOrder: 1 },
    { name: "前髪カット", category: "カット", price: 1100, duration: 15, lastBookingTime: "19:30", displayOrder: 2 },
    { name: "キッズカット（小学生以下）", category: "カット", price: 3300, duration: 45, lastBookingTime: "19:00", displayOrder: 3 },
    // カラー
    { name: "フルカラー", category: "カラー", price: 8800, duration: 90, lastBookingTime: "18:00", displayOrder: 1 },
    { name: "リタッチカラー", category: "カラー", price: 6600, duration: 60, lastBookingTime: "18:30", displayOrder: 2 },
    { name: "イルミナカラー", category: "カラー", price: 11000, duration: 90, lastBookingTime: "18:00", displayOrder: 3 },
    { name: "ハイライト", category: "カラー", price: 5500, duration: 60, lastBookingTime: "18:00", priceVariable: true, displayOrder: 4 },
    { name: "グレイカラー（白髪染め）", category: "カラー", price: 7700, duration: 60, lastBookingTime: "18:30", displayOrder: 5 },
    // パーマ
    { name: "パーマ", category: "パーマ", price: 8800, duration: 90, lastBookingTime: "18:00", displayOrder: 1 },
    { name: "デジタルパーマ", category: "パーマ", price: 13200, duration: 120, lastBookingTime: "17:00", displayOrder: 2 },
    { name: "コスメパーマ", category: "パーマ", price: 11000, duration: 90, lastBookingTime: "18:00", displayOrder: 3 },
    { name: "ポイントパーマ", category: "パーマ", price: 5500, duration: 60, lastBookingTime: "18:30", priceVariable: true, displayOrder: 4 },
    // 縮毛矯正
    { name: "縮毛矯正", category: "縮毛矯正", price: 17600, duration: 180, lastBookingTime: "16:00", priceVariable: true, displayOrder: 1 },
    { name: "ポイント縮毛矯正（前髪）", category: "縮毛矯正", price: 5500, duration: 60, lastBookingTime: "18:30", displayOrder: 2 },
    { name: "酸性ストレート", category: "縮毛矯正", price: 22000, duration: 180, lastBookingTime: "16:00", displayOrder: 3 },
    // 髪質改善
    { name: "髪質改善トリートメント", category: "髪質改善", price: 11000, duration: 90, lastBookingTime: "18:00", displayOrder: 1 },
    { name: "酸熱トリートメント", category: "髪質改善", price: 16500, duration: 90, lastBookingTime: "18:00", displayOrder: 2 },
    { name: "TOKIO インカラミ", category: "髪質改善", price: 8800, duration: 60, lastBookingTime: "18:30", displayOrder: 3 },
    // トリートメント
    { name: "クイックトリートメント", category: "トリートメント", price: 2200, duration: 15, lastBookingTime: "19:30", displayOrder: 1 },
    { name: "スペシャルトリートメント", category: "トリートメント", price: 4400, duration: 30, lastBookingTime: "19:00", displayOrder: 2 },
    { name: "プレミアムトリートメント", category: "トリートメント", price: 6600, duration: 45, lastBookingTime: "19:00", displayOrder: 3 },
    // ヘッドスパ
    { name: "クイックスパ（15分）", category: "ヘッドスパ", price: 2200, duration: 15, lastBookingTime: "19:30", displayOrder: 1 },
    { name: "リラックススパ（30分）", category: "ヘッドスパ", price: 4400, duration: 30, lastBookingTime: "19:00", displayOrder: 2 },
    { name: "プレミアムスパ（45分）", category: "ヘッドスパ", price: 6600, duration: 45, lastBookingTime: "19:00", displayOrder: 3 },
    // ヘアセット
    { name: "ヘアセット", category: "ヘアセット", price: 5500, duration: 45, lastBookingTime: "19:00", displayOrder: 1 },
    { name: "成人式ヘアセット", category: "ヘアセット", price: 8800, duration: 60, lastBookingTime: "18:30", displayOrder: 2 },
    { name: "ブライダルヘアメイク", category: "ヘアセット", price: 33000, duration: 120, lastBookingTime: "17:00", priceVariable: true, displayOrder: 3 },
    // セットメニュー
    { name: "カット + カラー", category: "セットメニュー", price: 12100, duration: 120, lastBookingTime: "17:30", displayOrder: 1 },
    { name: "カット + パーマ", category: "セットメニュー", price: 12100, duration: 120, lastBookingTime: "17:30", displayOrder: 2 },
    { name: "カット + 髪質改善", category: "セットメニュー", price: 14300, duration: 120, lastBookingTime: "17:30", displayOrder: 3 },
    { name: "美髪フルコース（カット+カラー+髪質改善+スパ）", category: "セットメニュー", price: 27500, duration: 180, lastBookingTime: "16:00", displayOrder: 4 },
    // 店販商品
    { name: "シャンプー", category: "店販商品", price: 3300, duration: 0, lastBookingTime: "19:00", priceVariable: true, displayOrder: 1 },
    { name: "トリートメント", category: "店販商品", price: 3850, duration: 0, lastBookingTime: "19:00", priceVariable: true, displayOrder: 2 },
    { name: "ヘアオイル", category: "店販商品", price: 2750, duration: 0, lastBookingTime: "19:00", priceVariable: true, displayOrder: 3 },
  ];

  for (const menu of menus) {
    const categoryId = categoryMap[menu.category];
    await prisma.menu.upsert({
      where: {
        id: `${menu.category}-${menu.displayOrder}`,
      },
      update: {
        name: menu.name,
        categoryId,
        price: menu.price,
        priceVariable: menu.priceVariable || false,
        duration: menu.duration,
        lastBookingTime: menu.lastBookingTime,
        displayOrder: menu.displayOrder,
      },
      create: {
        id: `${menu.category}-${menu.displayOrder}`,
        name: menu.name,
        categoryId,
        price: menu.price,
        priceVariable: menu.priceVariable || false,
        duration: menu.duration,
        lastBookingTime: menu.lastBookingTime,
        displayOrder: menu.displayOrder,
      },
    });
  }

  // 設定
  await prisma.settings.upsert({
    where: { key: "closed_days" },
    update: { value: "[1]" },
    create: { key: "closed_days", value: "[1]" },
  });

  await prisma.settings.upsert({
    where: { key: "tax_rate" },
    update: { value: "10" },
    create: { key: "tax_rate", value: "10" },
  });

  // 決済方法
  const paymentMethods = [
    { code: "CASH", displayName: "現金", displayOrder: 1 },
    { code: "CREDIT_CARD", displayName: "クレジットカード", displayOrder: 2 },
    { code: "PAYPAY", displayName: "PayPay", displayOrder: 3 },
    { code: "ID", displayName: "iD", displayOrder: 4 },
    { code: "QUICPAY", displayName: "QUICPay", displayOrder: 5 },
    { code: "SUICA", displayName: "交通系IC", displayOrder: 6 },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethodSetting.upsert({
      where: { code: pm.code },
      update: pm,
      create: pm,
    });
  }

  // スタイリスト
  const staffMembers = [
    {
      id: "staff-yamada",
      name: "山田 花子",
      nameEn: "Hanako Yamada",
      role: "Director",
      image: "/person1.png",
      bio: "髪のお悩みに寄り添い、ライフスタイルに合った最適なスタイルをご提案いたします。一緒に「なりたい自分」を見つけましょう。",
      specialties: JSON.stringify(["ショートヘア", "パーマスタイル", "ヘアケア"]),
      experience: "15年",
      socialMedia: JSON.stringify({ instagram: "@hanako_lumina" }),
      displayOrder: 1,
    },
    {
      id: "staff-sato",
      name: "佐藤 美咲",
      nameEn: "Misaki Sato",
      role: "Top Stylist",
      image: "/person2.png",
      bio: "お客様の個性を活かした、再現性の高いスタイルを心がけています。カラーのことなら何でもご相談ください。",
      specialties: JSON.stringify(["カラーリング", "ハイライト", "トリートメント"]),
      experience: "10年",
      socialMedia: JSON.stringify({ instagram: "@misaki_lumina" }),
      displayOrder: 2,
    },
  ];

  const staffIds: string[] = [];
  for (const s of staffMembers) {
    const staff = await prisma.staff.upsert({
      where: { id: s.id },
      update: { ...s },
      create: s,
    });
    staffIds.push(staff.id);
  }

  // スタイリストのスケジュール（月曜以外の全日）
  const daySchedules = [
    { dayOfWeek: 0, startTime: "09:00", endTime: "19:00" }, // 日曜
    // dayOfWeek: 1 (月曜) - 定休日
    { dayOfWeek: 2, startTime: "10:00", endTime: "20:00" }, // 火曜
    { dayOfWeek: 3, startTime: "10:00", endTime: "20:00" }, // 水曜
    { dayOfWeek: 4, startTime: "10:00", endTime: "20:00" }, // 木曜
    { dayOfWeek: 5, startTime: "10:00", endTime: "20:00" }, // 金曜
    { dayOfWeek: 6, startTime: "09:00", endTime: "19:00" }, // 土曜
  ];

  for (const staffId of staffIds) {
    for (const sched of daySchedules) {
      await prisma.staffSchedule.upsert({
        where: {
          staffId_dayOfWeek: { staffId, dayOfWeek: sched.dayOfWeek },
        },
        update: sched,
        create: { staffId, ...sched },
      });
    }
  }

  // デモ顧客データ（20名）
  const customers = [
    { name: "田中 美咲", email: "tanaka.misaki@example.com", phone: "090-1234-5678" },
    { name: "佐藤 優子", email: "sato.yuko@example.com", phone: "080-2345-6789" },
    { name: "鈴木 あかり", email: "suzuki.akari@example.com", phone: "070-3456-7890" },
    { name: "高橋 花", email: "takahashi.hana@example.com", phone: "090-4567-8901" },
    { name: "伊藤 真由", email: "ito.mayu@example.com", phone: "080-5678-9012" },
    { name: "渡辺 さくら", email: "watanabe.sakura@example.com", phone: "090-6789-0123" },
    { name: "山本 凛", email: "yamamoto.rin@example.com", phone: "070-7890-1234" },
    { name: "中村 結衣", email: "nakamura.yui@example.com", phone: "080-8901-2345" },
    { name: "小林 莉子", email: "kobayashi.riko@example.com", phone: "090-9012-3456" },
    { name: "加藤 陽菜", email: "kato.hina@example.com", phone: "080-0123-4567" },
    { name: "吉田 七海", email: "yoshida.nanami@example.com", phone: "070-1111-2222" },
    { name: "山田 彩花", email: "yamada.ayaka@example.com", phone: "090-2222-3333" },
    { name: "松本 葵", email: "matsumoto.aoi@example.com", phone: "080-3333-4444" },
    { name: "井上 琴音", email: "inoue.kotone@example.com", phone: "070-4444-5555" },
    { name: "木村 朱里", email: "kimura.akari@example.com", phone: "090-5555-6666" },
    { name: "林 美月", email: "hayashi.mizuki@example.com", phone: "080-6666-7777" },
    { name: "清水 詩織", email: "shimizu.shiori@example.com", phone: "070-7777-8888" },
    { name: "森 愛", email: "mori.ai@example.com", phone: "090-8888-9999" },
    { name: "池田 萌", email: "ikeda.moe@example.com", phone: "080-9999-0000" },
    { name: "橋本 紬", email: "hashimoto.tsumugi@example.com", phone: "070-0000-1111" },
  ];

  const customerIds: string[] = [];
  for (const c of customers) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { name: c.name, email: c.email, phone: c.phone, role: "CUSTOMER" },
    });
    customerIds.push(user.id);
  }

  // デモ予約データ（今日〜1週間分）
  const now = new Date();
  const menuList = await prisma.menu.findMany({ include: { category: true } });

  // 過去の予約（完了済み: 直近2週間分）
  for (let dayOffset = -14; dayOffset < 0; dayOffset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    if (d.getDay() === 1) continue; // 月曜定休
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const reservationCount = 2 + (Math.abs(dayOffset) % 3); // 2〜4件/日

    for (let i = 0; i < reservationCount; i++) {
      const customer = customerIds[(Math.abs(dayOffset) * 3 + i) % customerIds.length];
      const menu = menuList[(Math.abs(dayOffset) + i) % menuList.length];
      const startHour = 10 + i * 2;
      const startTime = `${String(startHour).padStart(2, "0")}:00`;
      const endMinutes = startHour * 60 + menu.duration;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

      const assignedStaffId = staffIds[i % staffIds.length];
      const assignedStaff = staffMembers.find(s => s.id === assignedStaffId)!;
      const reservation = await prisma.reservation.create({
        data: {
          userId: customer,
          totalPrice: menu.price,
          totalDuration: menu.duration,
          menuSummary: menu.name,
          date: new Date(dateStr + "T12:00:00"),
          startTime,
          endTime,
          status: "COMPLETED",
          staffId: assignedStaffId,
          staffName: assignedStaff.name,
        },
      });
      await prisma.reservationItem.create({
        data: {
          reservationId: reservation.id,
          menuId: menu.id,
          menuName: menu.name,
          category: menu.category.name,
          price: menu.price,
          duration: menu.duration,
          orderIndex: 0,
        },
      });
    }
  }

  // 今日と明日以降の予約（確定済み）
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    if (d.getDay() === 1) continue; // 月曜定休
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const reservationCount = 2 + (dayOffset % 3); // 2〜4件/日

    for (let i = 0; i < reservationCount; i++) {
      const customer = customerIds[(dayOffset * 3 + i) % customerIds.length];
      const menu = menuList[(dayOffset * 2 + i) % menuList.length];
      const startHour = 10 + i * 2;
      const startTime = `${String(startHour).padStart(2, "0")}:00`;
      const endMinutes = startHour * 60 + menu.duration;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

      const assignedStaffId2 = staffIds[i % staffIds.length];
      const assignedStaff2 = staffMembers.find(s => s.id === assignedStaffId2)!;
      const reservation = await prisma.reservation.create({
        data: {
          userId: customer,
          totalPrice: menu.price,
          totalDuration: menu.duration,
          menuSummary: menu.name,
          date: new Date(dateStr + "T12:00:00"),
          startTime,
          endTime,
          status: "CONFIRMED",
          staffId: assignedStaffId2,
          staffName: assignedStaff2.name,
        },
      });
      await prisma.reservationItem.create({
        data: {
          reservationId: reservation.id,
          menuId: menu.id,
          menuName: menu.name,
          category: menu.category.name,
          price: menu.price,
          duration: menu.duration,
          orderIndex: 0,
        },
      });
    }
  }

  // デモ売上データ（過去分の予約に対応する売上）
  const completedReservations = await prisma.reservation.findMany({
    where: { status: "COMPLETED" },
    include: { items: true },
  });

  const paymentMethodCodes = ["CASH", "CREDIT_CARD", "PAYPAY", "CREDIT_CARD", "CASH", "SUICA"];
  let saleNum = 1;
  for (const res of completedReservations) {
    const taxRate = 10;
    const taxAmount = Math.floor(res.totalPrice * taxRate / (100 + taxRate));
    const subtotal = res.totalPrice - taxAmount;
    const pm = paymentMethodCodes[saleNum % paymentMethodCodes.length];
    const saleNumber = `S${String(saleNum++).padStart(6, "0")}`;
    const saleDate = new Date(res.date);
    const saleTime = res.endTime;

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        userId: res.userId,
        reservationId: res.id,
        subtotal,
        taxAmount,
        taxRate,
        totalAmount: res.totalPrice,
        paymentMethod: pm,
        paymentStatus: "PAID",
        saleDate,
        saleTime,
      },
    });

    for (const item of res.items) {
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          itemType: "MENU",
          menuId: item.menuId,
          menuName: item.menuName,
          category: item.category,
          duration: item.duration,
          quantity: 1,
          unitPrice: item.price,
          subtotal: item.price,
          orderIndex: item.orderIndex,
        },
      });
    }

    await prisma.payment.create({
      data: {
        saleId: sale.id,
        paymentMethod: pm,
        amount: res.totalPrice,
        orderIndex: 0,
      },
    });
  }

  // デモ用クーポン
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      name: "初回10%OFF",
      type: "PERCENTAGE",
      value: 10,
      description: "初回ご来店のお客様限定！全メニュー10%OFF",
      onlyFirstTime: true,
      validFrom: now,
      validUntil: oneYearLater,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "SUMMER2026" },
    update: {},
    create: {
      code: "SUMMER2026",
      name: "夏のキャンペーン ¥1,000 OFF",
      type: "FIXED",
      value: 1000,
      description: "夏限定！¥5,000以上のメニューで¥1,000 OFF",
      minimumAmount: 5000,
      validFrom: now,
      validUntil: oneYearLater,
      usageLimit: 100,
    },
  });

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
