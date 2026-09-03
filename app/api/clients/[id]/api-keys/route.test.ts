import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    client: { findUnique: vi.fn() },
    apiKey: { create: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock('@/lib/admin-auth', () => ({
  isAuthorizedAdminRequest: vi.fn(),
}));
vi.mock('@/lib/api-key', () => ({
  generateApiKey: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { generateApiKey } from '@/lib/api-key';
import { GET, POST } from './route';

function makeRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/clients/c1/api-keys', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/clients/[id]/api-keys', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.client.findUnique).mockReset();
    vi.mocked(prisma.apiKey.create).mockReset();
    vi.mocked(generateApiKey).mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await POST(makeRequest('POST', { label: 'Prod' }), makeParams('c1'));
    expect(response.status).toBe(401);
  });

  it('returns 400 when label is missing', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    const response = await POST(makeRequest('POST', {}), makeParams('c1'));
    expect(response.status).toBe(400);
  });

  it('returns 404 when the client does not exist', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null);
    const response = await POST(makeRequest('POST', { label: 'Prod' }), makeParams('missing'));
    expect(response.status).toBe(404);
  });

  it('creates the key and returns the plaintext key once', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: 'c1' } as never);
    vi.mocked(generateApiKey).mockReturnValue({
      key: 'ar_live_plaintext',
      keyHash: 'hashed',
      keyPrefix: 'ar_live_plain',
    });
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: 'key1',
      label: 'Prod',
      keyPrefix: 'ar_live_plain',
      createdAt: new Date('2026-01-01'),
      lastUsedAt: null,
      revokedAt: null,
    } as never);

    const response = await POST(makeRequest('POST', { label: 'Prod' }), makeParams('c1'));

    expect(response.status).toBe(201);
    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: { clientId: 'c1', label: 'Prod', keyHash: 'hashed', keyPrefix: 'ar_live_plain' },
    });
    const json = await response.json();
    expect(json.key).toBe('ar_live_plaintext');
    expect(json.id).toBe('key1');
  });
});

describe('GET /api/clients/[id]/api-keys', () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedAdminRequest).mockReset();
    vi.mocked(prisma.apiKey.findMany).mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(false);
    const response = await GET(makeRequest('GET'), makeParams('c1'));
    expect(response.status).toBe(401);
  });

  it('lists keys without the raw key/hash', async () => {
    vi.mocked(isAuthorizedAdminRequest).mockReturnValue(true);
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue([
      { id: 'key1', label: 'Prod', keyPrefix: 'ar_live_plain', createdAt: new Date(), lastUsedAt: null, revokedAt: null },
    ] as never);

    const response = await GET(makeRequest('GET'), makeParams('c1'));

    expect(response.status).toBe(200);
    expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
      where: { clientId: 'c1' },
      select: {
        id: true,
        label: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
