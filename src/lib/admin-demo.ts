import type { Session } from "next-auth";
import { prisma } from "./db";
import { ADMIN_AUTH_DISABLED } from "./admin-access";

type DemoAdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
};

export async function getDemoAdminUser(): Promise<DemoAdminUser | null> {
  if (!ADMIN_AUTH_DISABLED) return null;

  const user = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) return null;

  return user;
}

export async function getDemoAdminSession(): Promise<Session | null> {
  const user = await getDemoAdminUser();

  if (!user) return null;

  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
