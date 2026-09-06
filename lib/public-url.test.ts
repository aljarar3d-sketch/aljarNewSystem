import { describe, expect, it } from 'vitest';
import { deriveOrigin } from './public-url';

describe('deriveOrigin', () => {
  it('builds an https origin from the host header by default', () => {
    const headers = new Headers({ host: 'example.com' });
    expect(deriveOrigin(headers)).toBe('https://example.com');
  });

  it('uses x-forwarded-proto when present', () => {
    const headers = new Headers({ host: 'example.com', 'x-forwarded-proto': 'http' });
    expect(deriveOrigin(headers)).toBe('http://example.com');
  });

  it('uses only the first entry of a comma-separated x-forwarded-proto chain', () => {
    const headers = new Headers({ host: 'example.com', 'x-forwarded-proto': 'https, http' });
    expect(deriveOrigin(headers)).toBe('https://example.com');
  });

  it('throws when there is no host header', () => {
    const headers = new Headers();
    expect(() => deriveOrigin(headers)).toThrow(/no Host header/);
  });
});
