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
   * Renders a plain, always-visible button below the model that launches the
   * platform AR viewer (iOS Quick Look / Android Scene Viewer / WebXR) when
   * tapped. Unlike auto-launching AR on page load (unreliable — browsers
   * only allow it within a short window of a real user gesture, which may
   * have already lapsed by the time the model finishes loading), a click on
   * this button IS that gesture, so it launches reliably wherever AR is
   * actually supported. On a device/browser without AR support, tapping it
   * is a silent no-op — model-viewer's `activateAR()` simply does nothing.
   */
  arButtonLabel?: string;
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
  arButtonLabel,
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

  function handleArButtonClick() {
    void elementRef.current?.activateAR();
  }

  return (
    <>
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
      {arButtonLabel && (
        <button
          type="button"
          onClick={handleArButtonClick}
          className="mt-4 w-full rounded-md bg-scan px-4 py-2.5 font-medium text-ink transition hover:opacity-90"
        >
          {arButtonLabel}
        </button>
      )}
    </>
  );
}
