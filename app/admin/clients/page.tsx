'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAdminSession } from '@/lib/admin-session';

interface ClientRow {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  categories: { id: string }[];
  _count: { assets: number };
}

interface ApiKeyRow {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface NewlyCreatedKey {
  clientId: string;
  key: string;
}

async function api(path: string, secret: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${secret}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  return response.status === 204 ? null : response.json();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminClientsPage() {
  const { secret: adminSecret } = useAdminSession();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newClientName, setNewClientName] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');
  const [confirmDeleteClientId, setConfirmDeleteClientId] = useState<string | null>(null);
  const [apiKeysByClient, setApiKeysByClient] = useState<Record<string, ApiKeyRow[]>>({});
  const [newKeyLabelByClient, setNewKeyLabelByClient] = useState<Record<string, string>>({});
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<NewlyCreatedKey | null>(null);
  const [copied, setCopied] = useState<'key' | 'url' | null>(null);

  async function loadClients() {
    const data = await api('/api/clients', adminSecret);
    setClients(data);
  }

  useEffect(() => {
    let cancelled = false;

    api('/api/clients', adminSecret)
      .then((data) => {
        if (!cancelled) setClients(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load clients');
      });

    return () => {
      cancelled = true;
    };
  }, [adminSecret]);

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await api('/api/clients', adminSecret, {
        method: 'POST',
        body: JSON.stringify({ name: newClientName, slug: slugify(newClientName) }),
      });
      setNewClientName('');
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    }
  }

  async function handleUpdateClient(id: string) {
    setError(null);
    try {
      await api(`/api/clients/${id}`, adminSecret, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingClientName }),
      });
      setEditingClientId(null);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    }
  }

  async function handleDeleteClient(id: string) {
    setError(null);
    try {
      await api(`/api/clients/${id}`, adminSecret, { method: 'DELETE' });
      setConfirmDeleteClientId(null);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  }

  async function toggleClientExpanded(clientId: string) {
    const willExpand = expandedClientId !== clientId;
    setExpandedClientId(willExpand ? clientId : null);
    setNewlyCreatedKey(null);

    if (willExpand) {
      try {
        const keys = await api(`/api/clients/${clientId}/api-keys`, adminSecret);
        setApiKeysByClient((prev) => ({ ...prev, [clientId]: keys }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API keys');
      }
    }
  }

  async function handleCreateApiKey(clientId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const label = newKeyLabelByClient[clientId] ?? '';
    try {
      const created = await api(`/api/clients/${clientId}/api-keys`, adminSecret, {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      setNewKeyLabelByClient((prev) => ({ ...prev, [clientId]: '' }));
      setNewlyCreatedKey({ clientId, key: created.key });
      const keys = await api(`/api/clients/${clientId}/api-keys`, adminSecret);
      setApiKeysByClient((prev) => ({ ...prev, [clientId]: keys }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  }

  async function handleRevokeApiKey(clientId: string, keyId: string) {
    setError(null);
    try {
      await api(`/api/clients/${clientId}/api-keys/${keyId}`, adminSecret, {
        method: 'PATCH',
        body: JSON.stringify({ revoked: true }),
      });
      const keys = await api(`/api/clients/${clientId}/api-keys`, adminSecret);
      setApiKeysByClient((prev) => ({ ...prev, [clientId]: keys }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  }

  async function copyToClipboard(text: string, which: 'key' | 'url') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard access can be denied by the browser; the value is still selectable/visible.
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-8 py-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight text-paper">Clients</h1>
        <p className="mt-1 text-sm text-dim">
          Deleting a client removes all of its categories, assets, uploaded files, and API keys.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <form onSubmit={handleCreateClient} className="flex gap-2">
        <input
          type="text"
          placeholder="New client name"
          value={newClientName}
          onChange={(event) => setNewClientName(event.target.value)}
          required
          className="flex-1 rounded-md border border-line bg-panel px-3 py-2 text-sm text-paper outline-none transition placeholder:text-dim/60 focus:border-scan"
        />
        <button
          type="submit"
          className="rounded-md bg-scan px-4 py-2 text-sm font-medium text-ink transition hover:opacity-90"
        >
          Add client
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {clients.map((client) => {
          const isExpanded = expandedClientId === client.id;
          return (
            <li key={client.id} className="rounded-lg border border-line bg-panel">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleClientExpanded(client.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="text-dim">{isExpanded ? '▾' : '▸'}</span>
                  {editingClientId === client.id ? (
                    <input
                      type="text"
                      value={editingClientName}
                      onChange={(event) => setEditingClientName(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      className="rounded-sm border border-line bg-panel-raised px-2 py-1 text-sm text-paper outline-none focus:border-scan"
                    />
                  ) : (
                    <span className="font-medium text-paper">{client.name}</span>
                  )}
                  <span className="text-xs text-dim">
                    {client.categories.length} categories · {client._count.assets} assets
                  </span>
                </button>

                {editingClientId === client.id ? (
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleUpdateClient(client.id)}
                      className="text-ready hover:underline"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingClientId(null)}
                      className="text-dim hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClientId(client.id);
                        setEditingClientName(client.name);
                      }}
                      className="text-dim hover:text-paper hover:underline"
                    >
                      Edit
                    </button>
                    {confirmDeleteClientId === client.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-danger hover:underline"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteClientId(null)}
                          className="text-dim hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteClientId(client.id)}
                        className="text-dim hover:text-danger hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-line px-4 py-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-dim">API access</h3>
                  <p className="mt-1 text-xs text-dim">
                    Give a developer the endpoint URL and a key below — the key alone determines which
                    client&apos;s assets they can fetch.
                  </p>

                  <div className="mt-3 flex items-center gap-2 rounded-md border border-line bg-panel-raised p-2 text-xs">
                    <code className="flex-1 overflow-x-auto whitespace-nowrap text-paper">
                      {`${typeof window === 'undefined' ? '' : window.location.origin}/api/v1/assets`}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/v1/assets`, 'url')}
                      className="shrink-0 rounded-sm bg-panel px-2 py-1 text-dim transition hover:text-paper"
                    >
                      {copied === 'url' ? 'Copied ✓' : 'Copy URL'}
                    </button>
                  </div>

                  {newlyCreatedKey && newlyCreatedKey.clientId === client.id && (
                    <div className="mt-3 flex flex-col gap-2 rounded-md border border-scan/50 bg-panel-raised p-3 text-xs">
                      <p className="text-ready">
                        Key created — copy it now. It can&apos;t be shown again (only its hash is stored); if it&apos;s
                        lost, revoke it and create a new one.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 overflow-x-auto whitespace-nowrap text-paper">
                          {newlyCreatedKey.key}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(newlyCreatedKey.key, 'key')}
                          className="shrink-0 rounded-sm bg-panel px-2 py-1 text-dim transition hover:text-paper"
                        >
                          {copied === 'key' ? 'Copied ✓' : 'Copy key'}
                        </button>
                      </div>
                    </div>
                  )}

                  <ul className="mt-3 flex flex-col gap-1.5">
                    {(apiKeysByClient[client.id] ?? []).map((key) => (
                      <li
                        key={key.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-panel-raised px-3 py-2 text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="text-paper">{key.label}</span>
                          <span className="font-mono text-dim">{key.keyPrefix}…</span>
                        </div>
                        {key.revokedAt ? (
                          <span className="text-danger">Revoked</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRevokeApiKey(client.id, key.id)}
                            className="text-dim hover:text-danger hover:underline"
                          >
                            Revoke
                          </button>
                        )}
                      </li>
                    ))}
                    {(apiKeysByClient[client.id] ?? []).length === 0 && (
                      <li className="text-xs text-dim">No API keys yet.</li>
                    )}
                  </ul>

                  <form onSubmit={(event) => handleCreateApiKey(client.id, event)} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Key label, e.g. Acme dev team"
                      value={newKeyLabelByClient[client.id] ?? ''}
                      onChange={(event) =>
                        setNewKeyLabelByClient((prev) => ({ ...prev, [client.id]: event.target.value }))
                      }
                      required
                      className="flex-1 rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-paper outline-none transition placeholder:text-dim/60 focus:border-scan"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-panel-raised px-3 py-1.5 text-sm text-paper transition hover:bg-line"
                    >
                      Create key
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
