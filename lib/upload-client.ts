'use client';

import { upload } from '@vercel/blob/client';
import type { AssetFileType } from '@/lib/upload-validation';

export interface UploadAssetFileParams {
  assetId: string;
  fileType: AssetFileType;
  file: File;
  adminSecret: string;
}

export async function uploadAssetFile({ assetId, fileType, file, adminSecret }: UploadAssetFileParams) {
  return upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    clientPayload: JSON.stringify({ assetId, fileType }),
    headers: {
      Authorization: `Bearer ${adminSecret}`,
    },
  });
}
