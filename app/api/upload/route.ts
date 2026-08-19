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
    // The Blob client's `upload()` discards the response body on a non-OK
    // response, so this log is the only place these errors are observable.
    console.error('upload route failed', error);

    const message = error instanceof Error ? error.message : 'Upload failed';
    const status = message === 'Unauthorized' ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
