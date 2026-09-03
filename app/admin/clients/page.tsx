'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { TopBar } from '@/components/TopBar';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ClientRow {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  categories: Category[];
  _count: { assets: number };
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
  const [adminSecret, setAdminSecret] = useState('');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newClientName, setNewClientName] = useState('');
  const [newCategoryNameByClient, setNewCategoryNameByClient] = useState<Record<string, string>>({});
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [confirmDeleteClientId, setConfirmDeleteClientId] = useState<string | null>(null);

  async function loadClients() {
    if (!adminSecret) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api('/api/clients', adminSecret);
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!adminSecret) return;
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

  async function handleCreateCategory(clientId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const name = newCategoryNameByClient[clientId] ?? '';
    try {
      await api('/api/categories', adminSecret, {
        method: 'POST',
        body: JSON.stringify({ clientId, name, slug: slugify(name) }),
      });
      setNewCategoryNameByClient((prev) => ({ ...prev, [clientId]: '' }));
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  }

  async function handleUpdateCategory(id: string) {
    setError(null);
    try {
      await api(`/api/categories/${id}`, adminSecret, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingCategoryName, slug: slugify(editingCategoryName) }),
      });
      setEditingCategoryId(null);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  }

  async function handleDeleteCategory(id: string) {
    setError(null);
    try {
      await api(`/api/categories/${id}`, adminSecret, { method: 'DELETE' });
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  }

  return (
    <>
      <TopBar crumb="admin / clients" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-paper">Clients &amp; categories</h1>
          <p className="mt-1 text-sm text-dim">
            Deleting a client removes all of its categories, assets, uploaded files, and API keys.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-dim">Admin secret</span>
          <input
            type="password"
            value={adminSecret}
            onChange={(event) => setAdminSecret(event.target.value)}
            className="rounded-md border border-line bg-panel px-3 py-2 text-paper outline-none transition focus:border-scan"
          />
        </label>

        {error && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {adminSecret && (
          <>
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

            {loading && <p className="text-sm text-dim">Loading…</p>}

            <ul className="flex flex-col gap-3">
              {clients.map((client) => {
                const isExpanded = expandedClientId === client.id;
                return (
                  <li key={client.id} className="rounded-lg border border-line bg-panel">
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
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
                        <ul className="flex flex-col gap-2">
                          {client.categories.map((category) => (
                            <li
                              key={category.id}
                              className="flex items-center justify-between gap-2 rounded-md bg-panel-raised px-3 py-2 text-sm"
                            >
                              {editingCategoryId === category.id ? (
                                <input
                                  type="text"
                                  value={editingCategoryName}
                                  onChange={(event) => setEditingCategoryName(event.target.value)}
                                  className="flex-1 rounded-sm border border-line bg-panel px-2 py-1 text-sm text-paper outline-none focus:border-scan"
                                />
                              ) : (
                                <span className="text-paper">{category.name}</span>
                              )}

                              {editingCategoryId === category.id ? (
                                <div className="flex gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCategory(category.id)}
                                    className="text-ready hover:underline"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategoryId(null)}
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
                                      setEditingCategoryId(category.id);
                                      setEditingCategoryName(category.name);
                                    }}
                                    className="text-dim hover:text-paper hover:underline"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="text-dim hover:text-danger hover:underline"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>

                        <form
                          onSubmit={(event) => handleCreateCategory(client.id, event)}
                          className="mt-3 flex gap-2"
                        >
                          <input
                            type="text"
                            placeholder="New category name"
                            value={newCategoryNameByClient[client.id] ?? ''}
                            onChange={(event) =>
                              setNewCategoryNameByClient((prev) => ({ ...prev, [client.id]: event.target.value }))
                            }
                            required
                            className="flex-1 rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-paper outline-none transition placeholder:text-dim/60 focus:border-scan"
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-panel-raised px-3 py-1.5 text-sm text-paper transition hover:bg-line"
                          >
                            Add category
                          </button>
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
