import { randomBytes, createHash } from 'crypto';

// Stripe-style prefix so a key is recognizable at a glance in logs/support
// tickets without revealing anything about the secret itself.
export const KEY_PREFIX = 'ar_live_';

const PREFIX_DISPLAY_LENGTH = KEY_PREFIX.length + 8;

export interface GeneratedApiKey {
  /** The full plaintext key. Only ever available at creation time — never stored. */
  key: string;
  /** SHA-256 hex digest of `key`. This is what gets stored and looked up. */
  keyHash: string;
  /** A short, safe-to-display slice of `key` (e.g. `ar_live_ab12cd34`), for identifying a key in a list. */
  keyPrefix: string;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): GeneratedApiKey {
  const key = `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
  return {
    key,
    keyHash: hashApiKey(key),
    keyPrefix: key.slice(0, PREFIX_DISPLAY_LENGTH),
  };
}
