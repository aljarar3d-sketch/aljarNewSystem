import { afterEach, describe, expect, it } from 'vitest';
import { isAuthorizedAdminRequest } from './admin-auth';

describe('isAuthorizedAdminRequest', () => {
  const originalSecret = process.env.ADMIN_API_SECRET;

  afterEach(() => {
    process.env.ADMIN_API_SECRET = originalSecret;
  });

  it('returns false when ADMIN_API_SECRET is not configured', () => {
    delete process.env.ADMIN_API_SECRET;
    const request = new Request('http://localhost/api/assets', {
      headers: { authorization: 'Bearer anything' },
    });
    expect(isAuthorizedAdminRequest(request)).toBe(false);
  });

  it('returns false when the Authorization header is missing', () => {
    process.env.ADMIN_API_SECRET = 'test-secret';
    const request = new Request('http://localhost/api/assets');
    expect(isAuthorizedAdminRequest(request)).toBe(false);
  });

  it('returns false when the bearer token does not match', () => {
    process.env.ADMIN_API_SECRET = 'test-secret';
    const request = new Request('http://localhost/api/assets', {
      headers: { authorization: 'Bearer wrong-token' },
    });
    expect(isAuthorizedAdminRequest(request)).toBe(false);
  });

  it('returns true when the bearer token matches the secret', () => {
    process.env.ADMIN_API_SECRET = 'test-secret';
    const request = new Request('http://localhost/api/assets', {
      headers: { authorization: 'Bearer test-secret' },
    });
    expect(isAuthorizedAdminRequest(request)).toBe(true);
  });
});
