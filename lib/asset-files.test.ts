import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@vercel/blob', () => ({
  del: vi.fn().mockResolvedValue(undefined),
}));

import { rm } from 'fs/promises';
import { del } from '@vercel/blob';
import { deleteAssetFiles } from './asset-files';

describe('deleteAssetFiles', () => {
  beforeEach(() => {
    vi.mocked(rm).mockReset().mockResolvedValue(undefined);
    vi.mocked(del).mockReset().mockResolvedValue(undefined);
  });

  it('removes the local upload directory for a local url', async () => {
    await deleteAssetFiles({
      id: 'asset_123',
      glbUrl: '/uploads/asset_123/model.glb',
      usdzUrl: null,
      posterUrl: null,
    });

    expect(rm).toHaveBeenCalledWith(expect.stringContaining('asset_123'), {
      recursive: true,
      force: true,
    });
    expect(del).not.toHaveBeenCalled();
  });

  it('calls blob del for a remote blob url', async () => {
    await deleteAssetFiles({
      id: 'asset_123',
      glbUrl: 'https://example.public.blob.vercel-storage.com/model.glb',
      usdzUrl: null,
      posterUrl: null,
    });

    expect(del).toHaveBeenCalledWith('https://example.public.blob.vercel-storage.com/model.glb');
    expect(rm).not.toHaveBeenCalled();
  });

  it('handles glb, usdz, and poster urls together, deduping the local directory removal', async () => {
    await deleteAssetFiles({
      id: 'asset_123',
      glbUrl: '/uploads/asset_123/model.glb',
      usdzUrl: '/uploads/asset_123/model.usdz',
      posterUrl: 'https://example.public.blob.vercel-storage.com/poster.png',
    });

    expect(rm).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith('https://example.public.blob.vercel-storage.com/poster.png');
  });

  it('does nothing when the asset has no stored files', async () => {
    await deleteAssetFiles({ id: 'asset_123', glbUrl: null, usdzUrl: null, posterUrl: null });

    expect(rm).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('does not throw when an individual deletion fails', async () => {
    vi.mocked(del).mockRejectedValue(new Error('network error'));

    await expect(
      deleteAssetFiles({
        id: 'asset_123',
        glbUrl: 'https://example.public.blob.vercel-storage.com/model.glb',
        usdzUrl: null,
        posterUrl: null,
      }),
    ).resolves.toBeUndefined();
  });
});
