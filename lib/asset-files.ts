import { rm } from 'fs/promises';
import path from 'path';
import { del } from '@vercel/blob';

// All uploads go through Vercel Blob now, but earlier local-disk uploads
// (public/uploads/<assetId>/) may still be referenced by existing rows.
const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

interface AssetFileUrls {
  id: string;
  glbUrl: string | null;
  usdzUrl: string | null;
  posterUrl: string | null;
}

// Deleting a client cascades to its assets in the DB, but the actual model
// files live outside the DB (Vercel Blob, or local disk for older uploads) and
// have to be cleaned up separately or they're orphaned forever.
export async function deleteAssetFiles(asset: AssetFileUrls): Promise<void> {
  const urls = [asset.glbUrl, asset.usdzUrl, asset.posterUrl].filter(
    (url): url is string => Boolean(url),
  );

  const hasLocalFile = urls.some((url) => url.startsWith('/uploads/'));
  const blobUrls = urls.filter((url) => !url.startsWith('/uploads/'));

  const tasks: Promise<void>[] = [];

  if (hasLocalFile) {
    tasks.push(
      rm(path.join(LOCAL_UPLOAD_ROOT, asset.id), { recursive: true, force: true }).catch((error) => {
        console.error(`Failed to remove local files for asset ${asset.id}`, error);
      }),
    );
  }

  for (const url of blobUrls) {
    tasks.push(
      del(url).catch((error) => {
        console.error(`Failed to delete blob ${url} for asset ${asset.id}`, error);
      }),
    );
  }

  await Promise.all(tasks);
}
