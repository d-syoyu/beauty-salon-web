import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
async function main() {
  const count = await prisma.sale.count();
  const recent = await prisma.sale.findMany({ orderBy: { saleDate: 'desc' }, take: 5, select: { saleDate: true, totalAmount: true, paymentStatus: true } });
  console.log('Sale総数:', count);
  recent.forEach(s => console.log(s.saleDate.toISOString().slice(0,10), s.totalAmount, s.paymentStatus));
}
main().catch(console.error).finally(() => prisma.$disconnect());
