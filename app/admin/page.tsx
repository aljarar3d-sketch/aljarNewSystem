'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminSession } from '@/lib/admin-session';

interface ClientSummary {
  id: string;
  categories: { id: string }[];
  _count: { assets: number };
}

function StatCard({ value, label, accent }: { value: number | null; label: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className={`font-display text-4xl font-medium tracking-tight ${accent ? 'text-scan' : 'text-paper'}`}>
        {value === null ? '—' : value}
      </p>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-dim">{label}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { secret } = useAdminSession();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clients', { headers: { Authorization: `Bearer ${secret}` } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: ClientSummary[]) => setClients(data))
      .catch(() => setError('Could not load your stats.'));
  }, [secret]);

  const totalAssets = clients?.reduce((sum, client) => sum + client._count.assets, 0) ?? null;
  const totalCategories = clients?.reduce((sum, client) => sum + client.categories.length, 0) ?? null;
  const totalClients = clients?.length ?? null;

  return (
    <main className="flex flex-1 flex-col gap-8 px-8 py-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight text-paper">Overview</h1>
        <p className="mt-1 text-sm text-dim">A look at what&apos;s in the system right now.</p>
      </div>

      {error && (
        <p className="max-w-md rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard value={totalAssets} label="3D assets" accent />
        <StatCard value={totalClients} label="Clients" />
        <StatCard value={totalCategories} label="Categories" />
      </div>

      <div>
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-dim">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/admin/upload"
            className="rounded-md bg-scan px-4 py-2 text-sm font-medium text-ink transition hover:opacity-90"
          >
            Upload an asset
          </Link>
          <Link
            href="/admin/clients"
            className="rounded-md border border-line px-4 py-2 text-sm text-paper transition hover:border-scan"
          >
            Add a client
          </Link>
        </div>
      </div>
    </main>
  );
}
