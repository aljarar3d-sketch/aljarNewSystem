import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { deleteAssetFiles } from '@/lib/asset-files';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateAssetSettingsBody {
  shadowIntensity?: number;
  shadowSoftness?: number;
  exposure?: number;
  toneMapping?: string;
  autoRotate?: boolean;
  skyboxImage?: string | null;
}

const TONE_MAPPING_VALUES = ['auto', 'aces', 'agx', 'commerce', 'neutral', 'reinhard', 'cineon', 'linear', 'none'];

function isOutOfRange(value: number | undefined, min: number, max: number): boolean {
  return value !== undefined && (typeof value !== 'number' || value < min || value > max);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateAssetSettingsBody;

  if (
    isOutOfRange(body.shadowIntensity, 0, 2) ||
    isOutOfRange(body.shadowSoftness, 0, 1) ||
    isOutOfRange(body.exposure, 0, 2)
  ) {
    return NextResponse.json({ error: 'A viewer setting is out of range' }, { status: 400 });
  }

  if (body.toneMapping !== undefined && !TONE_MAPPING_VALUES.includes(body.toneMapping)) {
    return NextResponse.json({ error: 'Unknown toneMapping value' }, { status: 400 });
  }

  const data: UpdateAssetSettingsBody = {};
  if (body.shadowIntensity !== undefined) data.shadowIntensity = body.shadowIntensity;
  if (body.shadowSoftness !== undefined) data.shadowSoftness = body.shadowSoftness;
  if (body.exposure !== undefined) data.exposure = body.exposure;
  if (body.toneMapping !== undefined) data.toneMapping = body.toneMapping;
  if (body.autoRotate !== undefined) data.autoRotate = body.autoRotate;
  if (body.skyboxImage !== undefined) data.skyboxImage = body.skyboxImage;

  const asset = await prisma.asset.update({ where: { id }, data });

  return NextResponse.json(asset);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { id: true, glbUrl: true, usdzUrl: true, posterUrl: true },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  await deleteAssetFiles(asset);
  await prisma.asset.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
