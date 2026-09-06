import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashApiKey } from '@/lib/api-key';
import { generateQrCodePng } from '@/lib/qr-code';
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
  const asset = await prisma.asset.findUnique({ where: { id, clientId: apiKey.clientId } });
  if (!asset) {
    return jsonWithCors({ error: 'Asset not found' }, { status: 404 });
  }

  const arUrl = `${deriveOrigin(request.headers)}/ar/${asset.id}`;
  const png = await generateQrCodePng(arUrl);

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
