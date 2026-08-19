import type { Asset } from '@prisma/client';

export function isAssetViewable(asset: Pick<Asset, 'status' | 'glbUrl'> | null): boolean {
  return Boolean(asset && asset.status === 'READY' && asset.glbUrl);
}
