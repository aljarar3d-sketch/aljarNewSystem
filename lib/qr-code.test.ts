import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}));

import { put } from '@vercel/blob';
import { generateQrCodePng, getOrCreateQrCodeUrl, uploadQrCodePng } from './qr-code';

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

describe('uploadQrCodePng', () => {
  beforeEach(() => {
    vi.mocked(put).mockReset();
  });

  it('uploads the generated PNG to a per-asset path and returns the public URL', async () => {
    vi.mocked(put).mockResolvedValue({ url: 'https://blob.example/qr/a1.png' } as never);

    const url = await uploadQrCodePng('a1', 'https://example.com/ar/a1');

    expect(url).toBe('https://blob.example/qr/a1.png');
    expect(put).toHaveBeenCalledTimes(1);
    const [pathname, body, options] = vi.mocked(put).mock.calls[0];
    expect(pathname).toBe('qr/a1.png');
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(options).toEqual({
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  });
});

describe('getOrCreateQrCodeUrl', () => {
  beforeEach(() => {
    vi.mocked(put).mockReset();
  });

  it('returns the existing qrCodeUrl without generating a new one', async () => {
    const update = vi.fn();

    const url = await getOrCreateQrCodeUrl(
      { id: 'a1', qrCodeUrl: 'https://blob.example/qr/a1.png' },
      'https://example.com/ar/a1',
      update,
    );

    expect(url).toBe('https://blob.example/qr/a1.png');
    expect(put).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('generates, uploads, and persists a qrCodeUrl when missing', async () => {
    vi.mocked(put).mockResolvedValue({ url: 'https://blob.example/qr/a1.png' } as never);
    const update = vi.fn().mockResolvedValue(undefined);

    const url = await getOrCreateQrCodeUrl({ id: 'a1', qrCodeUrl: null }, 'https://example.com/ar/a1', update);

    expect(url).toBe('https://blob.example/qr/a1.png');
    expect(update).toHaveBeenCalledWith('a1', 'https://blob.example/qr/a1.png');
  });
});
