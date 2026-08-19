export const ALLOWED_FILE_TYPES = ['glb', 'usdz'] as const;
export type AssetFileType = (typeof ALLOWED_FILE_TYPES)[number];

export const CONTENT_TYPE_BY_FILE_TYPE: Record<AssetFileType, string> = {
  glb: 'model/gltf-binary',
  usdz: 'model/vnd.usdz+zip',
};

export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

export interface UploadTokenPayload {
  assetId: string;
  fileType: AssetFileType;
}

export function isValidFileType(value: string): value is AssetFileType {
  return (ALLOWED_FILE_TYPES as readonly string[]).includes(value);
}

export function parseUploadClientPayload(clientPayload: string | null): UploadTokenPayload {
  if (!clientPayload) {
    throw new Error('Missing upload client payload');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(clientPayload);
  } catch {
    throw new Error('Upload client payload is not valid JSON');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('assetId' in parsed) ||
    !('fileType' in parsed)
  ) {
    throw new Error('Upload client payload is missing required fields');
  }

  const { assetId, fileType } = parsed as { assetId: unknown; fileType: unknown };

  if (typeof assetId !== 'string' || assetId.length === 0) {
    throw new Error('Upload client payload has an invalid assetId');
  }

  if (typeof fileType !== 'string' || !isValidFileType(fileType)) {
    throw new Error('Upload client payload has an invalid fileType');
  }

  return { assetId, fileType };
}
