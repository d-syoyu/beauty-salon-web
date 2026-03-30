// prisma/seed-sales.ts
// COMPLETEDな予約からSaleデータを生成する

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const paymentMethodCodes = ['CASH', 'CREDIT_CARD', 'PAYPAY', 'CREDIT_CARD', 'CASH', 'SUICA'];

async function main() {
  // 既存Saleを削除してから再作成
  await prisma.payment.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  console.log('既存Saleを削除しました');

  const completedReservations = await prisma.reservation.findMany({
    where: { status: 'COMPLETED' },
    include: { items: true },
    orderBy: { date: 'asc' },
  });

  console.log(`COMPLETED予約数: ${completedReservations.length}`);

  const taxRate = 10;
  let saleNum = 1;

  for (const res of completedReservations) {
    const taxAmount = Math.floor(res.totalPrice * taxRate / (100 + taxRate));
    const subtotal = res.totalPrice - taxAmount;
    const pm = paymentMethodCodes[saleNum % paymentMethodCodes.length];
    const saleNumber = `S${String(saleNum++).padStart(6, '0')}`;

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        userId: res.userId,
        reservationId: res.id,
        customerName: null,
        subtotal,
        taxAmount,
        taxRate,
        totalAmount: res.totalPrice,
        paymentMethod: pm,
        paymentStatus: 'PAID',
        saleDate: res.date,
        saleTime: res.endTime,
        staffId: res.staffId,
        staffName: res.staffName,
      },
    });

    for (const item of res.items) {
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          itemType: 'MENU',
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

  console.log(`✅ Sale生成完了: ${saleNum - 1}件`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
