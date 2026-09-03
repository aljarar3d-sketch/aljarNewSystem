import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: { findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { GET, POST } from './route';

function makeGetRequest() {
  return new Request('http://localhost/api/clients');
}

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/clients', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/clients', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.client.findMany).mockReset();
  });

  it('returns 401 when the request is not authorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await GET(makeGetRequest());
    expect(response.status).toBe(401);
  });

  it('lists clients with their categories and asset counts', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', name: 'Acme', slug: 'acme', categories: [], _count: { assets: 2 } },
    ] as never);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);
    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          categories: true,
          _count: { select: { assets: true } },
        }),
      }),
    );
    const json = await response.json();
    expect(json).toEqual([{ id: 'c1', name: 'Acme', slug: 'acme', categories: [], _count: { assets: 2 } }]);
  });
});

describe('POST /api/clients', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.client.create).mockReset();
  });

  it('returns 401 when the request is not authorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await POST(makePostRequest({ name: 'Acme', slug: 'acme' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when name or slug is missing', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    const response = await POST(makePostRequest({ name: 'Acme' }));
    expect(response.status).toBe(400);
  });

  it('creates the client and returns 201', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.create).mockResolvedValue({ id: 'c1', name: 'Acme', slug: 'acme' } as never);

    const response = await POST(makePostRequest({ name: 'Acme', slug: 'acme', contactEmail: 'a@b.com' }));

    expect(response.status).toBe(201);
    expect(prisma.client.create).toHaveBeenCalledWith({
      data: { name: 'Acme', slug: 'acme', contactEmail: 'a@b.com' },
    });
  });

  it('returns 409 when the slug is already taken', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.create).mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    );

    const response = await POST(makePostRequest({ name: 'Acme', slug: 'acme' }));
    expect(response.status).toBe(409);
  });
});
