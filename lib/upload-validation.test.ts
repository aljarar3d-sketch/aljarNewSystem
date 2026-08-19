import { describe, expect, it } from 'vitest';
import { isValidFileType, parseUploadClientPayload } from './upload-validation';

describe('isValidFileType', () => {
  it('accepts glb and usdz', () => {
    expect(isValidFileType('glb')).toBe(true);
    expect(isValidFileType('usdz')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidFileType('png')).toBe(false);
    expect(isValidFileType('')).toBe(false);
  });
});

describe('parseUploadClientPayload', () => {
  it('parses a valid payload', () => {
    const payload = parseUploadClientPayload(JSON.stringify({ assetId: 'asset_123', fileType: 'glb' }));
    expect(payload).toEqual({ assetId: 'asset_123', fileType: 'glb' });
  });

  it('throws when the payload is null', () => {
    expect(() => parseUploadClientPayload(null)).toThrow('Missing upload client payload');
  });

  it('throws when the payload is not valid JSON', () => {
    expect(() => parseUploadClientPayload('not json')).toThrow('not valid JSON');
  });

  it('throws when required fields are missing', () => {
    expect(() => parseUploadClientPayload(JSON.stringify({ assetId: 'asset_123' }))).toThrow(
      'missing required fields',
    );
  });

  it('throws when assetId is not a non-empty string', () => {
    expect(() => parseUploadClientPayload(JSON.stringify({ assetId: '', fileType: 'glb' }))).toThrow(
      'invalid assetId',
    );
  });

  it('throws when fileType is not glb or usdz', () => {
    expect(() =>
      parseUploadClientPayload(JSON.stringify({ assetId: 'asset_123', fileType: 'png' })),
    ).toThrow('invalid fileType');
  });
});
