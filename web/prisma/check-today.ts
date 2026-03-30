import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const total = await prisma.reservation.count();
  console.log('総予約数:', total);

  // 2026-03-29〜2026-03-31 の予約を確認
  const recent = await prisma.reservation.findMany({
    where: { date: { gte: new Date('2026-03-29T00:00:00Z'), lte: new Date('2026-03-31T23:59:59Z') } },
    select: { date: true, startTime: true, menuSummary: true, status: true }
  });
  console.log('3/29-31の予約:', recent.length);
  for (const r of recent) {
    console.log(' ', r.date.toISOString(), r.startTime, r.menuSummary);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
