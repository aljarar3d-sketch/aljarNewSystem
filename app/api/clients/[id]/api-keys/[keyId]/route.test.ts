import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    apiKey: { update: vi.fn() },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { PATCH } from './route';

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/clients/c1/api-keys/key1', {
    method: 'PATCH',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string, keyId: string) {
  return { params: Promise.resolve({ id, keyId }) };
}

describe('PATCH /api/clients/[id]/api-keys/[keyId]', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.apiKey.update).mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await PATCH(makeRequest({ revoked: true }), makeParams('c1', 'key1'));
    expect(response.status).toBe(401);
  });

  it('revokes the key by setting revokedAt', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({ id: 'key1', revokedAt: new Date() } as never);

    const response = await PATCH(makeRequest({ revoked: true }), makeParams('c1', 'key1'));

    expect(response.status).toBe(200);
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key1', clientId: 'c1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('returns 400 when revoked is not true', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    const response = await PATCH(makeRequest({ revoked: false }), makeParams('c1', 'key1'));
    expect(response.status).toBe(400);
  });
});
