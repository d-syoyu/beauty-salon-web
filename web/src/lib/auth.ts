// src/lib/auth.ts
// LUMINA HAIR STUDIO - NextAuth.js v5 Configuration

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }

  interface User {
    role: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // maxAge を省略 → セッションクッキー（ブラウザを閉じると消える）
      },
    },
  },
  pages: {
    signIn: "/admin",
    error: "/admin",
  },
  providers: [
    Credentials({
      id: "guest",
      name: "guest",
      credentials: {},
      async authorize() {
        // ゲストログイン: 管理者ユーザーを自動取得
        const user = await prisma.user.findFirst({
          where: { role: "ADMIN" },
        });

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}

export async function checkAdminAuth(): Promise<{
  error: Response | null;
  user: { id: string; name?: string | null; email?: string | null; role: string } | null;
}> {
  const session = await auth();

  if (!session?.user) {
    const { NextResponse } = await import("next/server");
    return {
      error: NextResponse.json({ error: "認証が必要です" }, { status: 401 }),
      user: null,
    };
  }

  if (session.user.role !== "ADMIN") {
    const { NextResponse } = await import("next/server");
    return {
      error: NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 }),
      user: null,
    };
  }

  return { error: null, user: session.user };
}
