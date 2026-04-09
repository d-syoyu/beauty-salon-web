import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const channels = Array.isArray(body.channels)
    ? body.channels.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  if (channels.length === 0) {
    return NextResponse.json({ error: 'At least one delivery channel is required.' }, { status: 400 });
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!announcement) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.campaignSend.createMany({
      data: channels.map((channel: string) => ({
        announcementId: id,
        channel,
        recipientCount: 0,
        successCount: 0,
        errorCount: 0,
      })),
    }),
    prisma.announcement.update({
      where: { id },
      data: { status: 'sent' },
    }),
  ]);

  const results = Object.fromEntries(channels.map((channel: string) => [channel, { sent: 0 }]));

  return NextResponse.json({ success: true, results });
}
