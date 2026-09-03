import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));
vi.mock('@/lib/asset-files', () => ({
  deleteAssetFiles: vi.fn().mockResolvedValue(undefined),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { deleteAssetFiles } from '@/lib/asset-files';
import { DELETE, PATCH } from './route';

function makeRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/clients/c1', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/clients/[id]', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.client.update).mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await PATCH(makeRequest('PATCH', { name: 'New' }), makeParams('c1'));
    expect(response.status).toBe(401);
  });

  it('updates the client', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.update).mockResolvedValue({ id: 'c1', name: 'New' } as never);

    const response = await PATCH(makeRequest('PATCH', { name: 'New' }), makeParams('c1'));

    expect(response.status).toBe(200);
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'New', contactEmail: undefined },
    });
  });
});

describe('DELETE /api/clients/[id]', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.client.findUnique).mockReset();
    vi.mocked(prisma.client.delete).mockReset();
    vi.mocked(deleteAssetFiles).mockClear();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await DELETE(makeRequest('DELETE'), makeParams('c1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when the client does not exist', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null);
    const response = await DELETE(makeRequest('DELETE'), makeParams('missing'));
    expect(response.status).toBe(404);
  });

  it('deletes each asset file then deletes the client, cascading in the db', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'c1',
      assets: [
        { id: 'a1', glbUrl: '/uploads/a1/model.glb', usdzUrl: null, posterUrl: null },
        { id: 'a2', glbUrl: null, usdzUrl: null, posterUrl: null },
      ],
    } as never);
    vi.mocked(prisma.client.delete).mockResolvedValue({ id: 'c1' } as never);

    const response = await DELETE(makeRequest('DELETE'), makeParams('c1'));

    expect(deleteAssetFiles).toHaveBeenCalledTimes(2);
    expect(prisma.client.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(response.status).toBe(204);
  });
});
