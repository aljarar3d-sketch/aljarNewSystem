import { describe, expect, it } from 'vitest';
import { isAssetViewable } from './asset-viewable';

describe('isAssetViewable', () => {
  it('returns false for null', () => {
    expect(isAssetViewable(null)).toBe(false);
  });

  it('returns false when status is not READY', () => {
    expect(isAssetViewable({ status: 'PROCESSING', glbUrl: 'https://blob/a.glb' })).toBe(false);
  });

  it('returns false when glbUrl is missing even if READY', () => {
    expect(isAssetViewable({ status: 'READY', glbUrl: null })).toBe(false);
  });

  it('returns true when READY with a glbUrl', () => {
    expect(isAssetViewable({ status: 'READY', glbUrl: 'https://blob/a.glb' })).toBe(true);
  });
});
