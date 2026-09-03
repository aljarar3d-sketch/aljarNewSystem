'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/admin-session';
import { ClientPicker } from '@/components/ClientPicker';
import { ArViewer } from '@/components/ArViewer';

interface Category {
  id: string;
  name: string;
}

interface AssetSummary {
  id: string;
  name: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  glbUrl: string | null;
  usdzUrl: string | null;
  posterUrl: string | null;
  categoryId: string | null;
  shadowIntensity: number;
  shadowSoftness: number;
  exposure: number;
  toneMapping: string;
  autoRotate: boolean;
  skyboxImage: string | null;
}

const TONE_MAPPING_OPTIONS = ['auto', 'aces', 'agx', 'commerce', 'neutral', 'reinhard', 'cineon', 'linear', 'none'];

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

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex justify-between text-dim">
        <span>{label}</span>
        <span className="font-mono text-paper">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-scan"
      />
    </label>
  );
}

export default function AdminAssetsPage() {
  const { secret: adminSecret } = useAdminSession();
  const [clientId, setClientId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [settings, setSettings] = useState<Pick<
    AssetSummary,
    'shadowIntensity' | 'shadowSoftness' | 'exposure' | 'toneMapping' | 'autoRotate' | 'skyboxImage'
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;

  useEffect(() => {
    if (!clientId) return;

    api('/api/clients', adminSecret)
      .then((clients: { id: string; categories: Category[] }[]) => {
        const client = clients.find((entry) => entry.id === clientId);
        setCategories(client?.categories ?? []);
      })
      .catch(() => setCategories([]));
  }, [clientId, adminSecret]);

  useEffect(() => {
    if (!clientId) return;

    const query = categoryId ? `?clientId=${clientId}&categoryId=${categoryId}` : `?clientId=${clientId}`;
    api(`/api/assets${query}`, adminSecret)
      .then((data: AssetSummary[]) => setAssets(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load assets'));
  }, [clientId, categoryId, adminSecret]);

  function handleClientChange(id: string) {
    setClientId(id);
    setCategoryId('');
    setCategories([]);
    setAssets([]);
    setSelectedAssetId('');
    setSettings(null);
  }

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    setSelectedAssetId('');
    setSettings(null);
  }

  function handleSelectAsset(asset: AssetSummary) {
    setSelectedAssetId(asset.id);
    setSettings({
      shadowIntensity: asset.shadowIntensity,
      shadowSoftness: asset.shadowSoftness,
      exposure: asset.exposure,
      toneMapping: asset.toneMapping,
      autoRotate: asset.autoRotate,
      skyboxImage: asset.skyboxImage,
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!selectedAsset || !settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/api/assets/${selectedAsset.id}`, adminSecret, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setAssets((prev) => prev.map((asset) => (asset.id === selectedAsset.id ? { ...asset, ...settings } : asset)));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-[380px_1fr]">
      <section className="reveal flex flex-col gap-5 border-b border-line px-6 py-8 md:border-b-0 md:border-r md:px-8">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-paper">Assets</h1>
          <p className="mt-1 text-sm text-dim">Pick an asset and tune how it renders in AR.</p>
        </div>

        <ClientPicker adminSecret={adminSecret} value={clientId} onChange={handleClientChange} />

        {clientId && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-dim">Category</span>
            <select
              value={categoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="rounded-md border border-line bg-panel px-3 py-2 text-paper outline-none transition focus:border-scan"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {clientId && (
          <ul className="flex flex-col gap-1.5">
            {assets.length === 0 && <li className="text-sm text-dim">No assets found.</li>}
            {assets.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => handleSelectAsset(asset)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                    asset.id === selectedAssetId
                      ? 'border-scan bg-panel-raised text-paper'
                      : 'border-line bg-panel text-paper hover:border-scan/50'
                  }`}
                >
                  <span>{asset.name}</span>
                  <span className="text-xs text-dim">{asset.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
        )}
      </section>

      <section className="viewport-grid flex flex-col items-center gap-6 px-6 py-10">
        {!selectedAsset && <p className="mt-16 text-sm text-dim">Select an asset to preview and tune it.</p>}

        {selectedAsset && settings && (
          <>
            <h2 className="font-display text-xl font-medium text-paper">{selectedAsset.name}</h2>

            {selectedAsset.glbUrl ? (
              <div className="w-full max-w-xl">
                <ArViewer
                  name={selectedAsset.name}
                  glbUrl={selectedAsset.glbUrl}
                  usdzUrl={selectedAsset.usdzUrl}
                  posterUrl={selectedAsset.posterUrl}
                  shadowIntensity={settings.shadowIntensity}
                  shadowSoftness={settings.shadowSoftness}
                  exposure={settings.exposure}
                  toneMapping={settings.toneMapping}
                  autoRotate={settings.autoRotate}
                  skyboxImage={settings.skyboxImage}
                />
              </div>
            ) : (
              <p className="text-sm text-dim">This asset has no uploaded model yet.</p>
            )}

            <div className="grid w-full max-w-xl grid-cols-1 gap-4 rounded-lg border border-line bg-panel p-5 sm:grid-cols-2">
              <Slider
                label="Shadow intensity"
                value={settings.shadowIntensity}
                min={0}
                max={2}
                step={0.05}
                onChange={(value) => setSettings({ ...settings, shadowIntensity: value })}
              />
              <Slider
                label="Shadow softness"
                value={settings.shadowSoftness}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => setSettings({ ...settings, shadowSoftness: value })}
              />
              <Slider
                label="Exposure"
                value={settings.exposure}
                min={0}
                max={2}
                step={0.05}
                onChange={(value) => setSettings({ ...settings, exposure: value })}
              />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-dim">Tone mapping</span>
                <select
                  value={settings.toneMapping}
                  onChange={(event) => setSettings({ ...settings, toneMapping: event.target.value })}
                  className="rounded-md border border-line bg-panel-raised px-3 py-2 text-paper outline-none transition focus:border-scan"
                >
                  {TONE_MAPPING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-dim">
                <input
                  type="checkbox"
                  checked={settings.autoRotate}
                  onChange={(event) => setSettings({ ...settings, autoRotate: event.target.checked })}
                  className="accent-scan"
                />
                Auto-rotate
              </label>
              <label className="col-span-full flex flex-col gap-1.5 text-sm">
                <span className="text-dim">Environment image (background / floor &amp; ceiling)</span>
                <input
                  type="text"
                  placeholder="https://…  (leave blank for the default dark viewport)"
                  value={settings.skyboxImage ?? ''}
                  onChange={(event) => setSettings({ ...settings, skyboxImage: event.target.value || null })}
                  className="rounded-md border border-line bg-panel-raised px-3 py-2 text-paper outline-none transition placeholder:text-dim/60 focus:border-scan"
                />
              </label>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="col-span-full mt-1 rounded-md bg-scan px-4 py-2.5 font-medium text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
