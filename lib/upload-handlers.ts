import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import {
  CONTENT_TYPE_BY_FILE_TYPE,
  MAX_UPLOAD_SIZE_BYTES,
  parseUploadClientPayload,
} from '@/lib/upload-validation';

export async function authorizeAssetUpload(request: Request, clientPayload: string | null) {
  if (!isAuthorizedAdminRequest(request)) {
    throw new Error('Unauthorized');
  }

  const payload = parseUploadClientPayload(clientPayload);

  const asset = await prisma.asset.findUnique({ where: { id: payload.assetId } });
  if (!asset) {
    throw new Error('Asset not found');
  }

  return {
    allowedContentTypes: [CONTENT_TYPE_BY_FILE_TYPE[payload.fileType]],
    maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
    // `@vercel/blob` defaults to `addRandomSuffix: false` + `allowOverwrite:
    // false`, so two assets uploading files with the same name (e.g. the very
    // common `model.glb`) would collide and the second upload would be
    // rejected — leaving that Asset stranded at PROCESSING forever, since
    // `onUploadCompleted` never fires for a rejected upload. Enforced here on
    // the server so a client-side change can't bypass it. Only the pathname is
    // affected; `blob.url` is what gets persisted and used downstream.
    addRandomSuffix: true,
    tokenPayload: JSON.stringify(payload),
  };
}

export async function completeAssetUpload(tokenPayload: string | null, blobUrl: string) {
  const payload = parseUploadClientPayload(tokenPayload);

  const data =
    payload.fileType === 'glb'
      ? { glbUrl: blobUrl, status: 'READY' as const }
      : { usdzUrl: blobUrl };

  await prisma.asset.update({ where: { id: payload.assetId }, data });
}
