import { describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/blob/client', () => ({
  upload: vi.fn().mockResolvedValue({ url: 'https://blob.example/a1.glb' }),
}));

import { upload } from '@vercel/blob/client';
import { uploadAssetFile } from './upload-client';

describe('uploadAssetFile', () => {
  it('calls the Blob client upload with the right pathname, file, and options', async () => {
    const file = new File(['binary-data'], 'chair.glb', { type: 'model/gltf-binary' });

    const result = await uploadAssetFile({
      assetId: 'a1',
      fileType: 'glb',
      file,
      adminSecret: 'dev-admin-secret',
    });

    expect(upload).toHaveBeenCalledWith('chair.glb', file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      clientPayload: JSON.stringify({ assetId: 'a1', fileType: 'glb' }),
      headers: { Authorization: 'Bearer dev-admin-secret' },
    });
    expect(result).toEqual({ url: 'https://blob.example/a1.glb' });
  });
});
