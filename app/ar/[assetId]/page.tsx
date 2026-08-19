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

  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/ar/${asset!.id}`;

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
