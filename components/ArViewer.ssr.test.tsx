// Runs in the vitest `node` environment (the project default) with NO mock for
// `@google/model-viewer`, so `document`/`HTMLElement` are genuinely undefined —
// the same conditions as Next.js App Router server-rendering a 'use client'
// component. A top-level `import '@google/model-viewer'` throws
// `ReferenceError: HTMLElement is not defined` here, which is exactly the
// production 500 this test guards against.
import { describe, expect, it } from 'vitest';

describe('ArViewer server rendering', () => {
  it('has no DOM globals in this environment (sanity check)', () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    expect(typeof globalThis.document).toBe('undefined');
  });

  it('can be imported on the server without touching DOM globals', async () => {
    await expect(import('./ArViewer')).resolves.toBeDefined();
  });

  it('renders to a string on the server without throwing', async () => {
    const { renderToString } = await import('react-dom/server');
    const { ArViewer } = await import('./ArViewer');
    const { createElement } = await import('react');

    const html = renderToString(
      createElement(ArViewer, {
        name: 'Chair',
        glbUrl: 'https://blob.example/chair.glb',
        usdzUrl: 'https://blob.example/chair.usdz',
        posterUrl: 'https://blob.example/chair-poster.png',
      }),
    );

    expect(html).toContain('model-viewer');
    expect(html).toContain('https://blob.example/chair.glb');
    expect(html).toContain('data-testid="ar-viewer"');
  });
});
