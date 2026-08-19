import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { authorizeAssetUpload, completeAssetUpload } from '@/lib/upload-handlers';

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) =>
        authorizeAssetUpload(request, clientPayload ?? null),
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        await completeAssetUpload(tokenPayload ?? null, blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
