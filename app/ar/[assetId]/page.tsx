import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAssetViewable } from '@/lib/asset-viewable';
import { ArViewer } from '@/components/ArViewer';
import { AssetQrCode } from '@/components/AssetQrCode';
import { TopBar } from '@/components/TopBar';

interface PageProps {
  params: Promise<{ assetId: string }>;
}

export default async function AssetArPage({ params }: PageProps) {
  const { assetId } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });

  if (!isAssetViewable(asset)) {
    notFound();
  }

  // These QR codes get printed on physical packaging, so a silently-relative
  // URL is far worse than a hard failure. Deriving the origin from the incoming
  // request avoids that and avoids `NEXT_PUBLIC_*` build-time inlining, which
  // would bake a stale origin into the bundle at build time.
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');

  if (!host) {
    throw new Error('Cannot build the public AR URL: the request has no Host header.');
  }

  // `x-forwarded-proto` can be a comma-separated chain when several proxies are
  // involved; the first entry is the one the client actually spoke.
  const protocol = (requestHeaders.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();
  const publicUrl = `${protocol}://${host}/ar/${asset!.id}`;

  return (
    <>
      <TopBar crumb={asset!.id} />
      <main className="viewport-grid flex flex-1 flex-col items-center gap-8 px-6 py-10">
        <h1 className="font-display text-3xl font-medium tracking-tight text-paper">{asset!.name}</h1>

        <div className="w-full max-w-2xl">
          <ArViewer
            name={asset!.name}
            glbUrl={asset!.glbUrl!}
            usdzUrl={asset!.usdzUrl}
            posterUrl={asset!.posterUrl}
            shadowIntensity={asset!.shadowIntensity}
            shadowSoftness={asset!.shadowSoftness}
            exposure={asset!.exposure}
            toneMapping={asset!.toneMapping}
            autoRotate={asset!.autoRotate}
            skyboxImage={asset!.skyboxImage}
          />
        </div>

        <section className="flex flex-col items-center gap-3 rounded-lg border border-line bg-panel p-6 text-center">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-dim">Scan to view on your phone</h2>
          <AssetQrCode url={publicUrl} />
        </section>
      </main>
    </>
  );
}
