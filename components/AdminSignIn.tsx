'use client';

import { useState, type FormEvent } from 'react';
import { useAdminSession } from '@/lib/admin-session';

export function AdminSignIn() {
  const { signIn } = useAdminSession();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setChecking(true);
    try {
      // No dedicated auth endpoint — GET /api/clients already rejects a
      // wrong secret with 401 before doing anything else, so it doubles
      // as a lightweight verification check.
      const response = await fetch('/api/clients', { headers: { Authorization: `Bearer ${secret}` } });
      if (!response.ok) {
        setError('That secret was rejected — check it and try again.');
        return;
      }
      signIn(secret);
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="viewport-grid flex flex-1 items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="reveal flex w-full max-w-xs flex-col gap-4 rounded-lg border border-line bg-panel p-6"
      >
        <div>
          <h1 className="font-display text-xl font-medium tracking-tight text-paper">Admin sign in</h1>
          <p className="mt-1 text-sm text-dim">Enter the shared admin secret to continue.</p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-dim">Admin secret</span>
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            required
            autoFocus
            className="rounded-md border border-line bg-panel-raised px-3 py-2 text-paper outline-none transition focus:border-scan"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={checking}
          className="rounded-md bg-scan px-4 py-2 text-sm font-medium text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
