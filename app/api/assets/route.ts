import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

interface CreateAssetBody {
  clientId?: string;
  name?: string;
  description?: string;
  categoryId?: string;
}

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as CreateAssetBody;

  if (!body.clientId || !body.name) {
    return NextResponse.json({ error: 'clientId and name are required' }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: body.clientId } });
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const asset = await prisma.asset.create({
    data: {
      clientId: body.clientId,
      name: body.name,
      description: body.description,
      categoryId: body.categoryId,
      status: 'PROCESSING',
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
