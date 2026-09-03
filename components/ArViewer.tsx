'use client';

import { createElement, useEffect } from 'react';

export interface ArViewerProps {
  name: string;
  glbUrl: string;
  usdzUrl?: string | null;
  posterUrl?: string | null;
  shadowIntensity?: number;
  shadowSoftness?: number;
  exposure?: number;
  toneMapping?: string;
  autoRotate?: boolean;
  skyboxImage?: string | null;
}

export function ArViewer({
  name,
  glbUrl,
  usdzUrl,
  posterUrl,
  shadowIntensity = 1,
  shadowSoftness = 1,
  exposure = 1,
  toneMapping = 'auto',
  autoRotate = true,
  skyboxImage,
}: ArViewerProps) {
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
    'auto-rotate': autoRotate,
    'shadow-intensity': String(shadowIntensity),
    'shadow-softness': String(shadowSoftness),
    exposure: String(exposure),
    'tone-mapping': toneMapping,
    'skybox-image': skyboxImage ?? undefined,
    style: { width: '100%', height: '520px', backgroundColor: '#14171c', borderRadius: '0.75rem' },
    'data-testid': 'ar-viewer',
  });
}
