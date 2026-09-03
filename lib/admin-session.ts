'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'admin_secret';

const listeners = new Set<() => void>();
let cachedSecret = typeof window === 'undefined' ? '' : (window.sessionStorage.getItem(STORAGE_KEY) ?? '');

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cachedSecret;
}

function getServerSnapshot() {
  return '';
}

function setStoredSecret(value: string) {
  cachedSecret = value;
  if (value) {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((listener) => listener());
}

export interface AdminSession {
  secret: string;
  isSignedIn: boolean;
  signIn: (secret: string) => void;
  signOut: () => void;
}

/**
 * The admin secret, remembered for the browser session (sessionStorage) so
 * it's entered once instead of on every admin page. Not a real auth
 * session — just a convenience wrapper around the same shared secret every
 * admin API route already checks.
 */
export function useAdminSession(): AdminSession {
  const secret = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    secret,
    isSignedIn: secret !== '',
    signIn: setStoredSecret,
    signOut: () => setStoredSecret(''),
  };
}
