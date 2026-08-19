'use client';

import { upload } from '@vercel/blob/client';
import {
  isValidFileType,
  MAX_UPLOAD_SIZE_BYTES,
  type AssetFileType,
} from '@/lib/upload-validation';

export interface UploadAssetFileParams {
  assetId: string;
  fileType: AssetFileType;
  file: File;
  /**
   * The shared `ADMIN_API_SECRET`, sent as `Authorization: Bearer <secret>` to
   * `/api/upload`.
   *
   * SECURITY: this value must NEVER be exposed via a `NEXT_PUBLIC_*` env var,
   * hardcoded in a component, or otherwise baked into a client bundle —
   * `NEXT_PUBLIC_*` values are inlined into JavaScript served to every visitor,
   * which would hand full admin write access to anyone who views source.
   */
  adminSecret: string;
}

/**
 * Uploads an asset file (`.glb`/`.usdz`) straight from the browser to Vercel
 * Blob, using `/api/upload` to mint a scoped client token.
 *
 * SECURITY: `adminSecret` is the shared admin secret. It must be supplied at
 * call time by an authenticated admin-only surface (e.g. fetched from a
 * session-gated endpoint after the operator has logged in) and must never be
 * committed to a client bundle or exposed through a `NEXT_PUBLIC_*` env var.
 * See the "Known limitations" section of the README.
 *
 * @throws {Error} if the file extension doesn't match `fileType`, or the file
 * exceeds `MAX_UPLOAD_SIZE_BYTES`. Both are checked before any bytes are sent,
 * and both are re-enforced server-side by `/api/upload`.
 */
export async function uploadAssetFile({ assetId, fileType, file, adminSecret }: UploadAssetFileParams) {
  if (!isValidFileType(fileType)) {
    throw new Error(`Unsupported file type "${fileType}". Expected one of: glb, usdz.`);
  }

  if (!file.name.toLowerCase().endsWith(`.${fileType}`)) {
    throw new Error(`File "${file.name}" does not have the expected .${fileType} extension.`);
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(
      `File "${file.name}" is ${file.size} bytes, which exceeds the ${MAX_UPLOAD_SIZE_BYTES} byte upload limit.`,
    );
  }

  return upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    clientPayload: JSON.stringify({ assetId, fileType }),
    headers: {
      Authorization: `Bearer ${adminSecret}`,
    },
  });
}
