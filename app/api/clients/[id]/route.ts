import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { deleteAssetFiles } from '@/lib/asset-files';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateClientBody {
  name?: string;
  contactEmail?: string;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateClientBody;

  const client = await prisma.client.update({
    where: { id },
    data: { name: body.name, contactEmail: body.contactEmail },
  });

  return NextResponse.json(client);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { assets: { select: { id: true, glbUrl: true, usdzUrl: true, posterUrl: true } } },
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  await Promise.all(client.assets.map((asset) => deleteAssetFiles(asset)));

  // Categories, assets, and API keys cascade-delete in the db (see schema.prisma).
  await prisma.client.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
