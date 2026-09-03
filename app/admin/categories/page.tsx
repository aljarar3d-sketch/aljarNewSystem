'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAdminSession } from '@/lib/admin-session';
import { ClientPicker } from '@/components/ClientPicker';

interface Category {
  id: string;
  name: string;
  slug: string;
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

export default function AdminCategoriesPage() {
  const { secret: adminSecret } = useAdminSession();
  const [clientId, setClientId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  async function loadCategories(id: string) {
    try {
      const clients: { id: string; categories: Category[] }[] = await api('/api/clients', adminSecret);
      const client = clients.find((entry) => entry.id === id);
      setCategories(client?.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    }
  }

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    api('/api/clients', adminSecret)
      .then((clients: { id: string; categories: Category[] }[]) => {
        if (cancelled) return;
        const client = clients.find((entry) => entry.id === clientId);
        setCategories(client?.categories ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load categories');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, adminSecret]);

  function handleClientChange(id: string) {
    setClientId(id);
    setEditingId(null);
    setCategories([]);
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await api('/api/categories', adminSecret, {
        method: 'POST',
        body: JSON.stringify({ clientId, name: newCategoryName, slug: slugify(newCategoryName) }),
      });
      setNewCategoryName('');
      await loadCategories(clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  }

  async function handleUpdateCategory(id: string) {
    setError(null);
    try {
      await api(`/api/categories/${id}`, adminSecret, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingName, slug: slugify(editingName) }),
      });
      setEditingId(null);
      await loadCategories(clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  }

  async function handleDeleteCategory(id: string) {
    setError(null);
    try {
      await api(`/api/categories/${id}`, adminSecret, { method: 'DELETE' });
      await loadCategories(clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-8 py-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight text-paper">Categories</h1>
        <p className="mt-1 text-sm text-dim">
          Deleting a category doesn&apos;t delete its assets — they just become uncategorized.
        </p>
      </div>

      <ClientPicker adminSecret={adminSecret} value={clientId} onChange={handleClientChange} />

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {clientId && (
        <>
          <ul className="flex flex-col gap-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm"
              >
                {editingId === category.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="flex-1 rounded-sm border border-line bg-panel-raised px-2 py-1 text-sm text-paper outline-none focus:border-scan"
                  />
                ) : (
                  <span className="text-paper">{category.name}</span>
                )}

                {editingId === category.id ? (
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleUpdateCategory(category.id)}
                      className="text-ready hover:underline"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-dim hover:underline">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
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
            {categories.length === 0 && <li className="text-sm text-dim">No categories yet.</li>}
          </ul>

          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="New category name"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              required
              className="flex-1 rounded-md border border-line bg-panel px-3 py-2 text-sm text-paper outline-none transition placeholder:text-dim/60 focus:border-scan"
            />
            <button
              type="submit"
              className="rounded-md bg-scan px-4 py-2 text-sm font-medium text-ink transition hover:opacity-90"
            >
              Add category
            </button>
          </form>
        </>
      )}
    </main>
  );
}
