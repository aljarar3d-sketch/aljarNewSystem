import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAssetViewable } from '@/lib/asset-viewable';
import { ArViewer } from '@/components/ArViewer';

interface PageProps {
  params: Promise<{ assetId: string }>;
}

export default async function AssetArPage({ params }: PageProps) {
  const { assetId } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });

  if (!isAssetViewable(asset)) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
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
          arButtonLabel="View in your space"
        />
      </div>
    </main>
  );
}
