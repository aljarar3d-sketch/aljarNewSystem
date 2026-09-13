import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    asset: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('@/lib/qr-code', () => ({
  getOrCreateQrCodeUrl: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getOrCreateQrCodeUrl } from '@/lib/qr-code';
import { GET } from './route';

function makeRequest(headers?: Record<string, string>) {
  return new Request('https://aljarnewsystem.vercel.app/api/v1/assets/a1/qr', {
    headers: { host: 'aljarnewsystem.vercel.app', ...headers },
    redirect: 'manual',
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/v1/assets/[id]/qr', () => {
  beforeEach(() => {
    vi.mocked(prisma.apiKey.findUnique).mockReset();
    vi.mocked(prisma.apiKey.update).mockReset();
    vi.mocked(prisma.asset.findUnique).mockReset();
    vi.mocked(prisma.asset.update).mockReset();
    vi.mocked(getOrCreateQrCodeUrl).mockReset();
  });

  it('returns 401 when no Authorization header is present', async () => {
    const response = await GET(makeRequest(), makeParams('a1'));
    expect(response.status).toBe(401);
  });

  it('returns 401 when the key is unknown or revoked', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);
    const response = await GET(makeRequest({ Authorization: 'Bearer bogus' }), makeParams('a1'));
    expect(response.status).toBe(401);
  });

  it("returns 404 when the asset doesn't exist or belongs to a different client", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ id: 'key1', clientId: 'c1', revokedAt: null } as never);
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(null);

    const response = await GET(makeRequest({ Authorization: 'Bearer valid' }), makeParams('a1'));

    expect(response.status).toBe(404);
    expect(prisma.asset.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1', clientId: 'c1' },
      select: { id: true, qrCodeUrl: true },
    });
  });

  it('redirects to the public QR image URL for the asset', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ id: 'key1', clientId: 'c1', revokedAt: null } as never);
    vi.mocked(prisma.asset.findUnique).mockResolvedValue({ id: 'a1', qrCodeUrl: null } as never);
    vi.mocked(getOrCreateQrCodeUrl).mockResolvedValue('https://blob.example/qr/a1.png');

    const response = await GET(makeRequest({ Authorization: 'Bearer valid' }), makeParams('a1'));

    expect(getOrCreateQrCodeUrl).toHaveBeenCalledWith(
      { id: 'a1', qrCodeUrl: null },
      'https://aljarnewsystem.vercel.app/ar/a1',
      expect.any(Function),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://blob.example/qr/a1.png');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
