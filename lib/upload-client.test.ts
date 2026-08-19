import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/blob/client', () => ({
  upload: vi.fn().mockResolvedValue({ url: 'https://blob.example/a1.glb' }),
}));

import { upload } from '@vercel/blob/client';
import { MAX_UPLOAD_SIZE_BYTES } from './upload-validation';
import { uploadAssetFile } from './upload-client';

/** Builds a small File that reports an arbitrary `size`, without allocating it. */
function fileOfSize(name: string, size: number, type: string) {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('uploadAssetFile', () => {
  beforeEach(() => {
    vi.mocked(upload).mockClear();
  });

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

  it('rejects an oversized file before calling upload', async () => {
    const file = fileOfSize('chair.glb', MAX_UPLOAD_SIZE_BYTES + 1, 'model/gltf-binary');

    await expect(
      uploadAssetFile({ assetId: 'a1', fileType: 'glb', file, adminSecret: 'dev-admin-secret' }),
    ).rejects.toThrow(/exceeds the \d+ byte upload limit/);

    expect(upload).not.toHaveBeenCalled();
  });

  it('accepts a file exactly at the size limit', async () => {
    const file = fileOfSize('chair.glb', MAX_UPLOAD_SIZE_BYTES, 'model/gltf-binary');

    await uploadAssetFile({ assetId: 'a1', fileType: 'glb', file, adminSecret: 'dev-admin-secret' });

    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('rejects a file whose extension does not match the fileType before calling upload', async () => {
    const file = new File(['binary-data'], 'chair.usdz', { type: 'model/vnd.usdz+zip' });

    await expect(
      uploadAssetFile({ assetId: 'a1', fileType: 'glb', file, adminSecret: 'dev-admin-secret' }),
    ).rejects.toThrow('File "chair.usdz" does not have the expected .glb extension.');

    expect(upload).not.toHaveBeenCalled();
  });

  it('rejects an unsupported fileType before calling upload', async () => {
    const file = new File(['binary-data'], 'chair.obj', { type: 'application/octet-stream' });

    await expect(
      uploadAssetFile({
        assetId: 'a1',
        // Simulates a caller reaching this from untyped JS / a widened value.
        fileType: 'obj' as never,
        file,
        adminSecret: 'dev-admin-secret',
      }),
    ).rejects.toThrow('Unsupported file type "obj"');

    expect(upload).not.toHaveBeenCalled();
  });

  it('accepts an uppercase extension that matches the fileType', async () => {
    const file = new File(['binary-data'], 'CHAIR.GLB', { type: 'model/gltf-binary' });

    await uploadAssetFile({ assetId: 'a1', fileType: 'glb', file, adminSecret: 'dev-admin-secret' });

    expect(upload).toHaveBeenCalledTimes(1);
  });
});
