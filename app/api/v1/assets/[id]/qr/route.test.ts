import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    asset: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/qr-code', () => ({
  generateQrCodePng: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { generateQrCodePng } from '@/lib/qr-code';
import { GET } from './route';

function makeRequest(headers?: Record<string, string>) {
  return new Request('https://aljarnewsystem.vercel.app/api/v1/assets/a1/qr', {
    headers: { host: 'aljarnewsystem.vercel.app', ...headers },
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
    vi.mocked(generateQrCodePng).mockReset();
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
    expect(prisma.asset.findUnique).toHaveBeenCalledWith({ where: { id: 'a1', clientId: 'c1' } });
  });

  it('returns a PNG QR code pointing at the asset AR page', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ id: 'key1', clientId: 'c1', revokedAt: null } as never);
    vi.mocked(prisma.asset.findUnique).mockResolvedValue({ id: 'a1' } as never);
    const pngBuffer = Buffer.from('fake-png');
    vi.mocked(generateQrCodePng).mockResolvedValue(pngBuffer);

    const response = await GET(makeRequest({ Authorization: 'Bearer valid' }), makeParams('a1'));

    expect(generateQrCodePng).toHaveBeenCalledWith('https://aljarnewsystem.vercel.app/ar/a1');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const body = Buffer.from(await response.arrayBuffer());
    expect(body.equals(pngBuffer)).toBe(true);
  });
});
