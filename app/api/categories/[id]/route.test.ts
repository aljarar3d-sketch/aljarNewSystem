import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    category: { update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { DELETE, PATCH } from './route';

function makeRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/categories/cat1', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/categories/[id]', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.category.update).mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await PATCH(makeRequest('PATCH', { name: 'New' }), makeParams('cat1'));
    expect(response.status).toBe(401);
  });

  it('updates the category', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.category.update).mockResolvedValue({ id: 'cat1', name: 'New' } as never);

    const response = await PATCH(makeRequest('PATCH', { name: 'New', slug: 'new' }), makeParams('cat1'));

    expect(response.status).toBe(200);
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'cat1' },
      data: { name: 'New', slug: 'new' },
    });
  });
});

describe('DELETE /api/categories/[id]', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.category.delete).mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await DELETE(makeRequest('DELETE'), makeParams('cat1'));
    expect(response.status).toBe(401);
  });

  it('deletes the category, unlinking its assets via the db (onDelete: SetNull)', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.category.delete).mockResolvedValue({ id: 'cat1' } as never);

    const response = await DELETE(makeRequest('DELETE'), makeParams('cat1'));

    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat1' } });
    expect(response.status).toBe(204);
  });
});
