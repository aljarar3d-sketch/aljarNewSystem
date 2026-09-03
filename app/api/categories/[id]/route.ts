import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateCategoryBody {
  name?: string;
  slug?: string;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateCategoryBody;

  const category = await prisma.category.update({
    where: { id },
    data: { name: body.name, slug: body.slug },
  });

  return NextResponse.json(category);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Assets in this category are unlinked, not deleted (onDelete: SetNull in schema.prisma).
  await prisma.category.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
