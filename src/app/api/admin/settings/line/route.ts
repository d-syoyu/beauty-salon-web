import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminAuth } from '@/lib/auth';

const lineKeys = [
  'line_channel_access_token',
  'line_channel_secret',
  'line_liff_id',
  'line_basic_id',
] as const;

export async function GET() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const settings = await prisma.settings.findMany({
    where: { key: { in: [...lineKeys] } },
  });

  const map = Object.fromEntries(settings.map((item) => [item.key, item.value]));

  return NextResponse.json({
    configured: Boolean(map.line_channel_access_token && map.line_channel_secret && map.line_liff_id),
    lineBasicId: map.line_basic_id ?? null,
    liffId: map.line_liff_id ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  const body = await request.json();
  const channelAccessToken = String(body.channelAccessToken ?? '').trim();
  const channelSecret = String(body.channelSecret ?? '').trim();
  const liffId = String(body.liffId ?? '').trim();
  const lineBasicId = String(body.lineBasicId ?? '').trim();

  if (!channelAccessToken || !channelSecret || !liffId) {
    return NextResponse.json(
      { error: 'Channel access token, secret, and LIFF ID are required.' },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.settings.upsert({
      where: { key: 'line_channel_access_token' },
      update: { value: channelAccessToken },
      create: { key: 'line_channel_access_token', value: channelAccessToken },
    }),
    prisma.settings.upsert({
      where: { key: 'line_channel_secret' },
      update: { value: channelSecret },
      create: { key: 'line_channel_secret', value: channelSecret },
    }),
    prisma.settings.upsert({
      where: { key: 'line_liff_id' },
      update: { value: liffId },
      create: { key: 'line_liff_id', value: liffId },
    }),
    prisma.settings.upsert({
      where: { key: 'line_basic_id' },
      update: { value: lineBasicId },
      create: { key: 'line_basic_id', value: lineBasicId },
    }),
  ]);

  return NextResponse.json({
    configured: true,
    lineBasicId: lineBasicId || null,
  });
}

export async function DELETE() {
  const { error } = await checkAdminAuth();
  if (error) return error;

  await prisma.settings.deleteMany({
    where: { key: { in: [...lineKeys] } },
  });

  return NextResponse.json({ success: true });
}
