import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: { findUnique: vi.fn() },
    category: { create: vi.fn() },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/categories', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/categories', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.client.findUnique).mockReset();
    vi.mocked(prisma.category.create).mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await POST(makeRequest({ clientId: 'c1', name: 'Chairs', slug: 'chairs' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when a required field is missing', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    const response = await POST(makeRequest({ clientId: 'c1', name: 'Chairs' }));
    expect(response.status).toBe(400);
  });

  it('returns 404 when the client does not exist', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null);
    const response = await POST(makeRequest({ clientId: 'missing', name: 'Chairs', slug: 'chairs' }));
    expect(response.status).toBe(404);
  });

  it('creates the category and returns 201', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: 'c1' } as never);
    vi.mocked(prisma.category.create).mockResolvedValue({ id: 'cat1', name: 'Chairs', slug: 'chairs' } as never);

    const response = await POST(makeRequest({ clientId: 'c1', name: 'Chairs', slug: 'chairs' }));

    expect(response.status).toBe(201);
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { clientId: 'c1', name: 'Chairs', slug: 'chairs' },
    });
  });

  it('returns 409 when the slug is already taken for that client', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: 'c1' } as never);
    vi.mocked(prisma.category.create).mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    );

    const response = await POST(makeRequest({ clientId: 'c1', name: 'Chairs', slug: 'chairs' }));
    expect(response.status).toBe(409);
  });
});
