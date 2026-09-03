import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashApiKey } from '@/lib/api-key';

const ASSET_FIELDS = {
  id: true,
  name: true,
  description: true,
  glbUrl: true,
  usdzUrl: true,
  posterUrl: true,
  categoryId: true,
  shadowIntensity: true,
  shadowSoftness: true,
  exposure: true,
  toneMapping: true,
  autoRotate: true,
  skyboxImage: true,
} as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization',
};

function jsonWithCors(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...CORS_HEADERS, ...init?.headers } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonWithCors({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = authHeader.slice('Bearer '.length);
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(key) } });

  if (!apiKey || apiKey.revokedAt) {
    return jsonWithCors({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  const assets = await prisma.asset.findMany({
    where: { clientId: apiKey.clientId, status: 'READY', ...(categoryId ? { categoryId } : {}) },
    select: ASSET_FIELDS,
    orderBy: { createdAt: 'desc' },
  });

  // Best-effort — a failed lastUsedAt update shouldn't fail the actual request.
  void prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return jsonWithCors(assets);
}
