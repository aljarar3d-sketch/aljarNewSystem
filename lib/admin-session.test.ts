// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAdminSession } from './admin-session';

describe('useAdminSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('starts signed out when sessionStorage is empty', () => {
    const { result } = renderHook(() => useAdminSession());
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.secret).toBe('');
  });

  it('signs in, persisting to sessionStorage', () => {
    const { result } = renderHook(() => useAdminSession());

    act(() => result.current.signIn('shh'));

    expect(result.current.secret).toBe('shh');
    expect(result.current.isSignedIn).toBe(true);
    expect(window.sessionStorage.getItem('admin_secret')).toBe('shh');
  });

  it('signs out, clearing sessionStorage', () => {
    const { result } = renderHook(() => useAdminSession());
    act(() => result.current.signIn('shh'));

    act(() => result.current.signOut());

    expect(result.current.secret).toBe('');
    expect(result.current.isSignedIn).toBe(false);
    expect(window.sessionStorage.getItem('admin_secret')).toBeNull();
  });

  it('shares state across every hook instance (it is a single global session)', () => {
    const a = renderHook(() => useAdminSession());
    const b = renderHook(() => useAdminSession());

    act(() => a.result.current.signIn('shared'));

    expect(b.result.current.secret).toBe('shared');
  });
});
