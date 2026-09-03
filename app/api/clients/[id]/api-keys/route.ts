import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { generateApiKey } from '@/lib/api-key';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface CreateApiKeyBody {
  label?: string;
}

const API_KEY_LIST_FIELDS = {
  id: true,
  label: true,
  keyPrefix: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;

export async function GET(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const keys = await prisma.apiKey.findMany({
    where: { clientId: id },
    select: API_KEY_LIST_FIELDS,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(keys);
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as CreateApiKeyBody;

  if (!body.label) {
    return NextResponse.json({ error: 'label is required' }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { key, keyHash, keyPrefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: { clientId: id, label: body.label, keyHash, keyPrefix },
  });

  // `key` is the only time the plaintext secret is ever available — it is not
  // stored anywhere, only `keyHash` is. The caller must show/copy it now.
  return NextResponse.json(
    {
      id: apiKey.id,
      label: apiKey.label,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      key,
    },
    { status: 201 },
  );
}
