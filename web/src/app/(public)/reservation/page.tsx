import { prisma } from '@/lib/db';
import ReservationWizard from '@/components/reservation/ReservationWizard';

export default async function ReservationPage() {
  const menus = await prisma.menu.findMany({
    where: { isActive: true, duration: { gt: 0 } },
    include: {
      category: {
        select: { id: true, name: true, nameEn: true, color: true, displayOrder: true },
      },
    },
    orderBy: [
      { category: { displayOrder: 'asc' } },
      { displayOrder: 'asc' },
    ],
  });

  const categoryIds = [...new Set(menus.map((m) => m.category.id))];
  const categories = await prisma.category.findMany({
    where: { isActive: true, id: { in: categoryIds } },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, name: true, nameEn: true, color: true, displayOrder: true },
  });

  return (
    <ReservationWizard
      initialMenus={menus}
      initialCategories={categories}
    />
  );
}
