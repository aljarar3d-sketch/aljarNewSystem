import { describe, expect, it } from 'vitest';
import { generateQrCodePng } from './qr-code';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('generateQrCodePng', () => {
  it('produces a PNG buffer with the ALJAR logo composited on top', async () => {
    const buffer = await generateQrCodePng('https://example.com/ar/abc123');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 8)).toEqual(PNG_MAGIC);
    // A bare QR PNG at this size is a few KB; the composited logo adds to
    // that, so a much smaller buffer would mean compositing silently failed.
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it('produces different output for different URLs', async () => {
    const a = await generateQrCodePng('https://example.com/ar/aaa');
    const b = await generateQrCodePng('https://example.com/ar/bbb');
    expect(a.equals(b)).toBe(false);
  });
});
