import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    asset: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/api-key', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-key')>();
  return { ...actual, hashApiKey: vi.fn(actual.hashApiKey) };
});

import prisma from '@/lib/prisma';
import { GET } from './route';

function makeRequest(headers?: Record<string, string>, query = '') {
  return new Request(`http://localhost/api/v1/assets${query}`, { headers });
}

describe('GET /api/v1/assets', () => {
  beforeEach(() => {
    vi.mocked(prisma.apiKey.findUnique).mockReset();
    vi.mocked(prisma.apiKey.update).mockReset();
    vi.mocked(prisma.asset.findMany).mockReset();
  });

  it('returns 401 when no Authorization header is present', async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('returns 401 when the key is unknown', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);
    const response = await GET(makeRequest({ Authorization: 'Bearer ar_live_bogus' }));
    expect(response.status).toBe(401);
  });

  it('returns 401 when the key is revoked', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key1',
      clientId: 'c1',
      revokedAt: new Date(),
    } as never);
    const response = await GET(makeRequest({ Authorization: 'Bearer ar_live_revoked' }));
    expect(response.status).toBe(401);
  });

  it('returns that key’s client’s READY assets and touches lastUsedAt', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key1',
      clientId: 'c1',
      revokedAt: null,
    } as never);
    vi.mocked(prisma.asset.findMany).mockResolvedValue([
      {
        id: 'a1',
        name: 'Chair',
        description: null,
        glbUrl: 'https://blob/chair.glb',
        usdzUrl: null,
        posterUrl: null,
        categoryId: null,
        shadowIntensity: 1,
        shadowSoftness: 1,
        exposure: 1,
        toneMapping: 'auto',
        autoRotate: true,
        skyboxImage: null,
      },
    ] as never);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);

    const response = await GET(makeRequest({ Authorization: 'Bearer ar_live_valid' }));

    expect(response.status).toBe(200);
    expect(prisma.asset.findMany).toHaveBeenCalledWith({
      where: { clientId: 'c1', status: 'READY' },
      select: expect.objectContaining({ id: true, name: true, glbUrl: true }),
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key1' },
      data: { lastUsedAt: expect.any(Date) },
    });
    const json = await response.json();
    expect(json).toEqual([
      expect.objectContaining({ id: 'a1', name: 'Chair', glbUrl: 'https://blob/chair.glb' }),
    ]);
  });

  it('filters by categoryId when provided', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ id: 'key1', clientId: 'c1', revokedAt: null } as never);
    vi.mocked(prisma.asset.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);

    await GET(makeRequest({ Authorization: 'Bearer ar_live_valid' }, '?categoryId=cat1'));

    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'c1', status: 'READY', categoryId: 'cat1' } }),
    );
  });

  it('sets CORS headers on the response', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ id: 'key1', clientId: 'c1', revokedAt: null } as never);
    vi.mocked(prisma.asset.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);

    const response = await GET(makeRequest({ Authorization: 'Bearer ar_live_valid' }));
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
