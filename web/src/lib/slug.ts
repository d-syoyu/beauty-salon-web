import type { PrismaClient } from "@prisma/client";

function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function slugify(input: string, fallback = "item"): string {
  return normalize(input) || fallback;
}

export async function ensureUniqueShopSlug(
  prisma: PrismaClient,
  input: string,
  currentShopId?: string,
): Promise<string> {
  const base = slugify(input, "shop");
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.shop.findFirst({
      where: { publicSlug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === currentShopId) {
      return candidate;
    }

    candidate = `${base}-${counter++}`;
  }
}
