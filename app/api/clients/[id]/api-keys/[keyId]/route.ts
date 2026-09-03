import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

interface RouteContext {
  params: Promise<{ id: string; keyId: string }>;
}

interface RevokeApiKeyBody {
  revoked?: boolean;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, keyId } = await params;
  const body = (await request.json()) as RevokeApiKeyBody;

  if (body.revoked !== true) {
    return NextResponse.json({ error: 'Only revoking (revoked: true) is supported' }, { status: 400 });
  }

  // Scoping the update to `clientId` too means a keyId from a different
  // client's key never matches, so this can't be used to revoke someone
  // else's key by guessing an id.
  const apiKey = await prisma.apiKey.update({
    where: { id: keyId, clientId: id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json(apiKey);
}
