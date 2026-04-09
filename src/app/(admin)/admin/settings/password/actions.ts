'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function changePasswordAction(
  _prev: { success: boolean; error: string | null },
  formData: FormData,
): Promise<{ success: boolean; error: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'You must be signed in.' };

  const current = formData.get('current') as string;
  const password = formData.get('password') as string;
  const confirm = formData.get('confirm') as string;

  if (!current) return { success: false, error: 'Current password is required.' };
  if (!password || password.length < 8) return { success: false, error: 'New password must be at least 8 characters.' };
  if (password !== confirm) return { success: false, error: 'Password confirmation does not match.' };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
  if (!dbUser?.password) return { success: false, error: 'This account does not have a local password.' };

  const valid = await bcrypt.compare(current, dbUser.password);
  if (!valid) return { success: false, error: 'Current password is incorrect.' };

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } });

  return { success: true, error: null };
}
