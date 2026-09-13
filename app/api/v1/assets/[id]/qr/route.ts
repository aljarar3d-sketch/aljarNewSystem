import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashApiKey } from '@/lib/api-key';
import { getOrCreateQrCodeUrl } from '@/lib/qr-code';
import { deriveOrigin } from '@/lib/public-url';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export async function GET(request: Request, { params }: RouteContext) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonWithCors({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = authHeader.slice('Bearer '.length);
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(key) } });

  if (!apiKey || apiKey.revokedAt) {
    return jsonWithCors({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Scoping to `clientId` too means a key can only ever get a QR code for its
  // own client's assets, even if it guesses another client's asset id.
  const asset = await prisma.asset.findUnique({
    where: { id, clientId: apiKey.clientId },
    select: { id: true, qrCodeUrl: true },
  });
  if (!asset) {
    return jsonWithCors({ error: 'Asset not found' }, { status: 404 });
  }

  const arUrl = `${deriveOrigin(request.headers)}/ar/${asset.id}`;
  const qrCodeUrl = await getOrCreateQrCodeUrl(asset, arUrl, (assetId, url) =>
    prisma.asset.update({ where: { id: assetId }, data: { qrCodeUrl: url } }),
  );

  // The QR is a plain public Blob file (same one returned as `qrCodeUrl` by
  // GET /api/v1/assets) — redirect there instead of re-serving the bytes, so
  // there's one source of truth and callers benefit from Blob's own caching.
  return NextResponse.redirect(qrCodeUrl, { status: 302, headers: CORS_HEADERS });
}
