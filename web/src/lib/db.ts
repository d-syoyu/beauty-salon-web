// lib/db.ts
// Prisma Client instance (SQLite) - Prisma 7 with better-sqlite3 adapter

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDbUrl(): string {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  if (path.isAbsolute(url.replace("file:", ""))) return url;
  // Prisma 7 resolves file:./dev.db relative to project root (where prisma.config.ts is)
  const relativePath = url.replace("file:", "");
  return "file:" + path.resolve(process.cwd(), relativePath);
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: getDbUrl() });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
