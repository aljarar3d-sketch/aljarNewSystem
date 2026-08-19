import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    asset: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { authorizeAssetUpload, completeAssetUpload } from './upload-handlers';

const authorizedRequest = new Request('http://localhost/api/upload');

describe('authorizeAssetUpload', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.asset.findUnique).mockReset();
  });

  it('throws Unauthorized when the request is not authorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    await expect(
      authorizeAssetUpload(authorizedRequest, JSON.stringify({ assetId: 'a1', fileType: 'glb' })),
    ).rejects.toThrow('Unauthorized');
  });

  it('throws when the client payload is invalid', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    await expect(authorizeAssetUpload(authorizedRequest, null)).rejects.toThrow(
      'Missing upload client payload',
    );
  });

  it('throws Asset not found when the asset does not exist', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(null);
    await expect(
      authorizeAssetUpload(authorizedRequest, JSON.stringify({ assetId: 'missing', fileType: 'glb' })),
    ).rejects.toThrow('Asset not found');
  });

  it('returns token config for a valid glb upload', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.asset.findUnique).mockResolvedValue({ id: 'a1' } as never);

    const result = await authorizeAssetUpload(
      authorizedRequest,
      JSON.stringify({ assetId: 'a1', fileType: 'glb' }),
    );

    expect(result.allowedContentTypes).toEqual(['model/gltf-binary']);
    expect(result.maximumSizeInBytes).toBe(100 * 1024 * 1024);
    expect(JSON.parse(result.tokenPayload)).toEqual({ assetId: 'a1', fileType: 'glb' });
  });
});

describe('completeAssetUpload', () => {
  beforeEach(() => {
    vi.mocked(prisma.asset.update).mockReset();
  });

  it('sets glbUrl and marks the asset READY for a glb upload', async () => {
    await completeAssetUpload(JSON.stringify({ assetId: 'a1', fileType: 'glb' }), 'https://blob/a1.glb');
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { glbUrl: 'https://blob/a1.glb', status: 'READY' },
    });
  });

  it('sets usdzUrl without changing status for a usdz upload', async () => {
    await completeAssetUpload(JSON.stringify({ assetId: 'a1', fileType: 'usdz' }), 'https://blob/a1.usdz');
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { usdzUrl: 'https://blob/a1.usdz' },
    });
  });
});
