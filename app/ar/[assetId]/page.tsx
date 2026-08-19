import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAssetViewable } from '@/lib/asset-viewable';
import { ArViewer } from '@/components/ArViewer';
import { AssetQrCode } from '@/components/AssetQrCode';

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
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        gap: '1.5rem',
      }}
    >
      <h1>{asset!.name}</h1>
      <ArViewer
        name={asset!.name}
        glbUrl={asset!.glbUrl!}
        usdzUrl={asset!.usdzUrl}
        posterUrl={asset!.posterUrl}
      />
      <section style={{ textAlign: 'center' }}>
        <h2>Scan to view on your phone</h2>
        <AssetQrCode url={publicUrl} />
      </section>
    </main>
  );
}
