'use client';

import { createElement } from 'react';
import '@google/model-viewer';

export interface ArViewerProps {
  name: string;
  glbUrl: string;
  usdzUrl?: string | null;
  posterUrl?: string | null;
}

export function ArViewer({ name, glbUrl, usdzUrl, posterUrl }: ArViewerProps) {
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
