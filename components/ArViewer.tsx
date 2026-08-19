'use client';

import { createElement, useEffect } from 'react';

export interface ArViewerProps {
  name: string;
  glbUrl: string;
  usdzUrl?: string | null;
  posterUrl?: string | null;
}

export function ArViewer({ name, glbUrl, usdzUrl, posterUrl }: ArViewerProps) {
  // `@google/model-viewer` registers a custom element at import time and has no
  // SSR guard — a top-level import throws `ReferenceError: HTMLElement is not
  // defined` when Next.js server-renders this client component. Loading it in
  // an effect keeps it browser-only.
  useEffect(() => {
    void import('@google/model-viewer');
  }, []);

  return createElement('model-viewer', {
    src: glbUrl,
    'ios-src': usdzUrl ?? undefined,
    poster: posterUrl ?? undefined,
    alt: name,
    ar: true,
    'ar-modes': 'webxr scene-viewer quick-look',
    'camera-controls': true,
    'auto-rotate': true,
    'shadow-intensity': '1',
    style: { width: '100%', height: '480px', backgroundColor: '#f5f5f5' },
    'data-testid': 'ar-viewer',
  });
}
