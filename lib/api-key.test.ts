import { describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey, KEY_PREFIX } from './api-key';

describe('generateApiKey', () => {
  it('produces a key starting with the expected prefix', () => {
    const { key } = generateApiKey();
    expect(key.startsWith(KEY_PREFIX)).toBe(true);
  });

  it('produces a keyPrefix that is a short, safe-to-display slice of the full key', () => {
    const { key, keyPrefix } = generateApiKey();
    expect(key.startsWith(keyPrefix)).toBe(true);
    expect(keyPrefix.length).toBeLessThan(key.length);
  });

  it('produces a keyHash matching hashApiKey(key)', () => {
    const { key, keyHash } = generateApiKey();
    expect(keyHash).toBe(hashApiKey(key));
  });

  it('produces different keys on each call', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key).not.toBe(b.key);
  });
});

describe('hashApiKey', () => {
  it('is deterministic for the same input', () => {
    expect(hashApiKey('same-key')).toBe(hashApiKey('same-key'));
  });

  it('differs for different inputs', () => {
    expect(hashApiKey('key-a')).not.toBe(hashApiKey('key-b'));
  });
});
