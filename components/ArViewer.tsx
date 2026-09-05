'use client';

import { useCallback, useEffect, useRef, type DetailedHTMLProps, type HTMLAttributes } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';

// `@google/model-viewer` ships a `HTMLElementTagNameMap` augmentation (for
// `document.createElement`/`querySelector`) but no JSX intrinsic-element
// typing, so `<model-viewer>` needs one here to be usable as JSX with its
// kebab-case attributes.
type ModelViewerJsxProps = DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
  src?: string;
  'ios-src'?: string;
  poster?: string;
  alt?: string;
  ar?: boolean;
  'ar-modes'?: string;
  'camera-controls'?: boolean;
  'auto-rotate'?: boolean;
  'shadow-intensity'?: string;
  'shadow-softness'?: string;
  exposure?: string;
  'tone-mapping'?: string;
  'skybox-image'?: string;
};

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by TypeScript's JSX.IntrinsicElements augmentation pattern
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJsxProps;
    }
  }
}

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
  /**
   * Launch straight into the platform AR viewer (iOS Quick Look / Android
   * Scene Viewer / WebXR) as soon as the model loads, instead of waiting for
   * someone to notice and tap the built-in AR button. Meant for the public
   * QR-code destination page only — never enable this on an admin preview,
   * where a staff member is just checking how the model looks.
   *
   * Browsers only allow launching AR/camera experiences within a short
   * window of a real user gesture. Scanning the QR code and tapping "Open"
   * counts as one, but by the time the model has finished loading that
   * window may have closed — this is inherently unreliable and varies by
   * device/browser. When it doesn't fire, the model-viewer's own AR button
   * is still there as a manual fallback.
   */
  autoLaunchAr?: boolean;
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
  autoLaunchAr = false,
}: ArViewerProps) {
  const elementRef = useRef<ModelViewerElement | null>(null);
  const setElementRef = useCallback((node: ModelViewerElement | null) => {
    elementRef.current = node;
  }, []);

  // `@google/model-viewer` registers a custom element at import time and has no
  // SSR guard — a top-level import throws `ReferenceError: HTMLElement is not
  // defined` when Next.js server-renders this client component. Loading it in
  // an effect keeps it browser-only.
  useEffect(() => {
    void import('@google/model-viewer');
  }, []);

  useEffect(() => {
    if (!autoLaunchAr) return;
    const element = elementRef.current;
    if (!element) return;

    function handleLoad() {
      if (element!.canActivateAR) {
        void element!.activateAR();
      }
    }

    element.addEventListener('load', handleLoad);
    return () => element.removeEventListener('load', handleLoad);
  }, [autoLaunchAr, glbUrl]);

  return (
    <model-viewer
      ref={setElementRef}
      src={glbUrl}
      ios-src={usdzUrl ?? undefined}
      poster={posterUrl ?? undefined}
      alt={name}
      ar
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate={autoRotate}
      shadow-intensity={String(shadowIntensity)}
      shadow-softness={String(shadowSoftness)}
      exposure={String(exposure)}
      tone-mapping={toneMapping}
      skybox-image={skyboxImage ?? undefined}
      style={{ width: '100%', height: '520px', backgroundColor: '#14171c', borderRadius: '0.75rem' }}
      data-testid="ar-viewer"
    />
  );
}
