'use client';

import { useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { TopBar } from '@/components/TopBar';
import { AssetQrCode } from '@/components/AssetQrCode';
import { ClientPicker } from '@/components/ClientPicker';
import { uploadAssetFile } from '@/lib/upload-client';

type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface Step {
  id: 'create' | 'glb' | 'usdz';
  label: string;
  status: StepStatus;
}

const STATUS_GLYPH: Record<StepStatus, string> = {
  pending: '·',
  active: '…',
  done: '✓',
  error: '✕',
};

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-dim">{label}</span>
      <input
        {...props}
        className="rounded-md border border-line bg-panel px-3 py-2 text-paper outline-none transition placeholder:text-dim/60 focus:border-scan file:mr-3 file:rounded-sm file:border-0 file:bg-panel-raised file:px-3 file:py-1.5 file:text-paper file:hover:bg-line"
      />
    </label>
  );
}

export default function AdminUploadPage() {
  const [adminSecret, setAdminSecret] = useState('');
  const [clientId, setClientId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [glbFile, setGlbFile] = useState<File | null>(null);
  const [usdzFile, setUsdzFile] = useState<File | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultAssetId, setResultAssetId] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // React state updates are async, so a `steps`/`activeLabel` read inside
  // this function would see stale values from when handleSubmit was called,
  // not the step just marked active a moment earlier. Track the active step
  // in a plain local variable instead, and use it (not state) in the catch.
  function updateStep(id: Step['id'], status: StepStatus) {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status } : step)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setResultAssetId(null);
    setViewerUrl(null);

    if (!clientId) {
      setErrorMessage("Couldn't start: pick a client from the list first.");
      return;
    }

    if (!glbFile) {
      setErrorMessage("Couldn't start: a .glb file is required.");
      return;
    }

    const initialSteps: Step[] = [
      { id: 'create', label: 'Create asset', status: 'active' },
      { id: 'glb', label: 'Upload .glb', status: 'pending' },
      ...(usdzFile ? [{ id: 'usdz' as const, label: 'Upload .usdz', status: 'pending' as StepStatus }] : []),
    ];
    setSteps(initialSteps);
    setSubmitting(true);

    let activeStep: Step = initialSteps[0];

    try {
      const createResponse = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ clientId, name: assetName }),
      });

      if (!createResponse.ok) {
        const body = await createResponse.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to create asset (${createResponse.status})`);
      }

      const asset = await createResponse.json();
      updateStep('create', 'done');

      activeStep = initialSteps[1];
      updateStep('glb', 'active');
      await uploadAssetFile({ assetId: asset.id, fileType: 'glb', file: glbFile, adminSecret });
      updateStep('glb', 'done');

      if (usdzFile) {
        activeStep = initialSteps[2];
        updateStep('usdz', 'active');
        await uploadAssetFile({ assetId: asset.id, fileType: 'usdz', file: usdzFile, adminSecret });
        updateStep('usdz', 'done');
      }

      setResultAssetId(asset.id);
      setViewerUrl(`${window.location.origin}/ar/${asset.id}`);
    } catch (error) {
      updateStep(activeStep.id, 'error');
      setErrorMessage(
        error instanceof Error
          ? `Couldn't finish ${activeStep.label.toLowerCase()}: ${error.message}`
          : "Couldn't finish the upload.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TopBar crumb="admin / upload" />
      <main className="grid flex-1 grid-cols-1 md:grid-cols-[420px_1fr]">
        <section className="reveal flex flex-col gap-6 border-b border-line px-6 py-8 md:border-b-0 md:border-r md:px-8">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-paper">Upload an asset</h1>
            <p className="mt-1 text-sm text-dim">
              Files upload straight from your browser to Vercel Blob storage.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Admin secret"
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              required
            />
            <ClientPicker adminSecret={adminSecret} value={clientId} onChange={setClientId} />
            <Field
              label="Asset name"
              type="text"
              placeholder="e.g. Walnut Dining Chair"
              value={assetName}
              onChange={(event) => setAssetName(event.target.value)}
              required
            />
            <Field
              label=".glb file (required — works on every device)"
              type="file"
              accept=".glb"
              onChange={(event) => setGlbFile(event.target.files?.[0] ?? null)}
              required
            />
            <Field
              label=".usdz file (optional — sharper AR on iPhone/iPad)"
              type="file"
              accept=".usdz"
              onChange={(event) => setUsdzFile(event.target.files?.[0] ?? null)}
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-md bg-scan px-4 py-2.5 font-medium text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Uploading…' : 'Create & upload'}
            </button>
          </form>
        </section>

        <section className="viewport-grid flex flex-col items-center justify-center gap-6 px-6 py-12">
          {steps.length === 0 && (
            <div className="reveal flex flex-col items-center gap-3 text-center">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                className="text-dim"
                aria-hidden="true"
              >
                <path d="M32 6 58 20v24L32 58 6 44V20z" />
                <path d="M32 6v24M32 30 6 20M32 30l26-10M32 30v28" />
              </svg>
              <p className="max-w-xs text-sm text-dim">
                Nothing uploaded yet. Fill in the form and we&apos;ll generate a shareable AR link.
              </p>
            </div>
          )}

          {steps.length > 0 && (
            <ol className="reveal w-full max-w-xs font-mono text-sm">
              {steps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex items-center justify-between border-b border-line py-2 last:border-b-0"
                >
                  <span className={step.status === 'pending' ? 'text-dim' : 'text-paper'}>
                    {String(index + 1).padStart(2, '0')} {step.label.toUpperCase()}
                  </span>
                  <span
                    className={
                      step.status === 'done'
                        ? 'text-ready'
                        : step.status === 'error'
                          ? 'text-danger'
                          : step.status === 'active'
                            ? 'scan-pulse text-scan'
                            : 'text-dim'
                    }
                  >
                    {STATUS_GLYPH[step.status]}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {errorMessage && (
            <p className="reveal max-w-xs rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-center text-sm text-danger">
              {errorMessage}
            </p>
          )}

          {resultAssetId && viewerUrl && (
            <div className="reveal flex flex-col items-center gap-3 rounded-lg border border-line bg-panel p-6">
              <span className="text-sm text-ready">Your asset is live.</span>
              <AssetQrCode url={viewerUrl} />
              <a href={`/ar/${resultAssetId}`} target="_blank" rel="noreferrer" className="text-sm text-scan hover:underline">
                View live →
              </a>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
