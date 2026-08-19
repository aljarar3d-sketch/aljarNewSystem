import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: { findUnique: vi.fn() },
    asset: { create: vi.fn() },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/assets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/assets', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.client.findUnique).mockReset();
    vi.mocked(prisma.asset.create).mockReset();
  });

  it('returns 401 when the request is not authorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await POST(makeRequest({ clientId: 'c1', name: 'Chair' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    const response = await POST(makeRequest({ clientId: 'c1' }));
    expect(response.status).toBe(400);
  });

  it('returns 404 when the client does not exist', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null);
    const response = await POST(makeRequest({ clientId: 'missing', name: 'Chair' }));
    expect(response.status).toBe(404);
  });

  it('creates the asset and returns 201', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: 'c1' } as never);
    vi.mocked(prisma.asset.create).mockResolvedValue({ id: 'a1', name: 'Chair', status: 'PROCESSING' } as never);

    const response = await POST(makeRequest({ clientId: 'c1', name: 'Chair' }));

    expect(response.status).toBe(201);
    expect(prisma.asset.create).toHaveBeenCalledWith({
      data: {
        clientId: 'c1',
        name: 'Chair',
        description: undefined,
        categoryId: undefined,
        status: 'PROCESSING',
      },
    });
    const json = await response.json();
    expect(json).toEqual({ id: 'a1', name: 'Chair', status: 'PROCESSING' });
  });
});
