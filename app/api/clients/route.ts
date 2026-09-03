import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

interface CreateClientBody {
  name?: string;
  slug?: string;
  contactEmail?: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export async function GET(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      categories: true,
      _count: { select: { assets: true } },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as CreateClientBody;

  if (!body.name || !body.slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
  }

  try {
    const client = await prisma.client.create({
      data: { name: body.name, slug: body.slug, contactEmail: body.contactEmail },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: 'A client with that slug already exists' }, { status: 409 });
    }
    throw error;
  }
}
