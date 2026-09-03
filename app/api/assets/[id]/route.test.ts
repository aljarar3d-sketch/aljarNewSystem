import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    asset: { update: vi.fn() },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { PATCH } from './route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/assets/a1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/assets/[id]', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.asset.update).mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await PATCH(makeRequest({ shadowIntensity: 0.5 }), makeParams('a1'));
    expect(response.status).toBe(401);
  });

  it('returns 400 when a numeric field is out of range', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    const response = await PATCH(makeRequest({ shadowIntensity: 5 }), makeParams('a1'));
    expect(response.status).toBe(400);
  });

  it('returns 400 for an unknown toneMapping value', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    const response = await PATCH(makeRequest({ toneMapping: 'bogus' }), makeParams('a1'));
    expect(response.status).toBe(400);
  });

  it('updates only the provided viewer settings', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.asset.update).mockResolvedValue({ id: 'a1', shadowIntensity: 0.5 } as never);

    const response = await PATCH(makeRequest({ shadowIntensity: 0.5, autoRotate: false }), makeParams('a1'));

    expect(response.status).toBe(200);
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { shadowIntensity: 0.5, autoRotate: false },
    });
  });

  it('accepts a null skyboxImage to clear it', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.asset.update).mockResolvedValue({ id: 'a1' } as never);

    const response = await PATCH(makeRequest({ skyboxImage: null }), makeParams('a1'));

    expect(response.status).toBe(200);
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { skyboxImage: null },
    });
  });
});
