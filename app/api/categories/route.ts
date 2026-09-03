import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

interface CreateCategoryBody {
  clientId?: string;
  name?: string;
  slug?: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as CreateCategoryBody;

  if (!body.clientId || !body.name || !body.slug) {
    return NextResponse.json({ error: 'clientId, name, and slug are required' }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: body.clientId } });
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    const category = await prisma.category.create({
      data: { clientId: body.clientId, name: body.name, slug: body.slug },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: 'A category with that slug already exists for this client' }, { status: 409 });
    }
    throw error;
  }
}
