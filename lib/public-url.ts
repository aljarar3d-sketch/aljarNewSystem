interface HeaderReader {
  get(name: string): string | null;
}

/**
 * Derives the public origin (protocol + host) from an incoming request's
 * headers. Used instead of a `NEXT_PUBLIC_*` env var so every deployment
 * (local, preview, production) automatically produces links/QR codes/API
 * responses pointing at its own origin — see the QR-code URL comment in
 * `app/ar/[assetId]/page.tsx` for the original rationale.
 *
 * Accepts anything header-shaped (a `Headers` instance, or the
 * `next/headers()` result), not just `Request['headers']`.
 */
export function deriveOrigin(headers: HeaderReader): string {
  const host = headers.get('host');

  if (!host) {
    throw new Error('Cannot build a public URL: the request has no Host header.');
  }

  // `x-forwarded-proto` can be a comma-separated chain when several proxies
  // are involved; the first entry is the one the client actually spoke.
  const protocol = (headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();

  return `${protocol}://${host}`;
}
