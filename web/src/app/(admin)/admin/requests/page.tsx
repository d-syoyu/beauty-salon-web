// src/app/(admin)/admin/requests/page.tsx
// RSC: fetches pending requests server-side via Prisma

import { listUnifiedRequests } from '@/lib/workforce-requests';
import RequestsClient, { type RequestItem } from './RequestsClient';

export default async function RequestsPage() {
  const raw = await listUnifiedRequests();
  // Serialize Date objects → strings and cast status for client component props
  const requests: RequestItem[] = raw.map((r) => ({
    ...r,
    date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    status: r.status as RequestItem['status'],
  }));
  return <RequestsClient initialRequests={requests} />;
}
