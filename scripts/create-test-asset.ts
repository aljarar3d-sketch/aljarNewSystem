import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  const client = await prisma.client.upsert({
    where: { slug: 'test-client' },
    update: {},
    create: { name: 'Test Client', slug: 'test-client' },
  });

  const asset = await prisma.asset.create({
    data: {
      clientId: client.id,
      name: 'Test Asset',
      status: 'PROCESSING',
    },
  });

  console.log(`Created asset ${asset.id} for client ${client.id}`);
  console.log(`Next: upload a .glb for assetId=${asset.id} via the upload pipeline.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
