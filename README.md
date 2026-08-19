# AR Asset Platform

Internal admin tooling for managing client 3D/AR assets (`.glb`/`.usdz`),
each with a permanent public AR-viewer page and QR code.

## Setup

1. Copy `.env.example` to `.env` and fill in real values:
   - `DATABASE_URL` / `DIRECT_DATABASE_URL` — a Vercel Postgres (Neon)
     connection string. Use the pooled connection string for
     `DATABASE_URL` and the direct one for `DIRECT_DATABASE_URL`.
   - `BLOB_READ_WRITE_TOKEN` — from your Vercel Blob store.
   - `ADMIN_API_SECRET` — any long random string. Sent as
     `Authorization: Bearer <secret>` by the client-side upload utility
     and required by `/api/assets` and `/api/upload`.
   - `VERCEL_BLOB_CALLBACK_URL` — **local development only.** See
     "Manual end-to-end verification" below. Leave it unset on Vercel.

   The QR code's target URL is derived from the incoming request's `Host`
   and `X-Forwarded-Proto` headers, so there is no site-URL env var to
   configure — each deployment automatically produces QR codes pointing
   at its own origin.
2. Apply the committed migration to your real database:
   ```bash
   npx prisma migrate deploy
   ```
   The initial migration is committed at
   `prisma/migrations/<timestamp>_init/migration.sql`. Use
   `npx prisma migrate dev` instead when you change `prisma/schema.prisma`
   and need a new migration generated.

   Prisma 7 moved connection URLs for Migrate out of `schema.prisma`
   into `prisma.config.ts` (already present in this repo — it reads
   `DIRECT_DATABASE_URL` for Migrate/introspection, since those need a
   direct, non-pooled connection; the app's runtime Prisma Client in
   `lib/prisma.ts` continues to use the pooled `DATABASE_URL` via a
   `@prisma/adapter-pg` driver adapter). You don't need to create or
   edit `prisma.config.ts` yourself — just make sure `DATABASE_URL` and
   `DIRECT_DATABASE_URL` are set in `.env` before running the command
   above.
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Manual end-to-end verification

> **This flow cannot complete against a plain local `npm run dev`.**
> `@vercel/blob` marks an asset `READY` from its `onUploadCompleted`
> webhook, which it only fires if it can resolve a *publicly reachable*
> callback URL. Off Vercel, that URL comes solely from
> `VERCEL_BLOB_CALLBACK_URL`; with it unset the SDK logs a warning and
> silently skips the callback, so the asset stays `PROCESSING` forever
> and `/ar/<assetId>` 404s unconditionally. Either run this against a
> **Vercel preview deployment** (where the callback URL is derived
> automatically and no extra config is needed), or expose your local dev
> server through a tunnel (`ngrok http 3000`, `cloudflared tunnel`) and
> set `VERCEL_BLOB_CALLBACK_URL` to that tunnel's **origin only** — the
> SDK appends the `/api/upload` path itself.

1. Seed a client directly (no admin UI yet):
   ```bash
   npx tsx scripts/create-test-asset.ts
   ```
   This creates a `Client` and an `Asset` row and prints the new
   `assetId`.

   To create further assets against an existing client, call the API
   directly (see "Creating an asset via the API" below).
2. Upload a real `.glb` file for that asset using `uploadAssetFile`
   from `lib/upload-client.ts` (wire it up to a temporary `<input type="file">`
   page) — there is no admin UI yet, so this step is code, not clicking.
   `uploadAssetFile` needs the `assetId` from step 1, `fileType: 'glb'`,
   the `File`, and `ADMIN_API_SECRET`.
3. Visit `/ar/<assetId>` and confirm the model renders and the QR code
   resolves back to the same page from a phone.

## Creating an asset via the API

`POST /api/assets` is the only way to create an `Asset` today. It
requires the shared admin secret:

```bash
curl -X POST http://localhost:3000/api/assets \
  -H "Authorization: Bearer $ADMIN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "clx0000000000000000000000",
    "name": "Dining Chair",
    "description": "Oak dining chair, 2026 line",
    "categoryId": "clx1111111111111111111111"
  }'
```

- `clientId` (required) — id of an existing `Client`.
- `name` (required) — non-empty string.
- `description` (optional) — string.
- `categoryId` (optional) — id of an existing `Category`.

Response (`201 Created`) — the created `Asset` row, unwrapped:

```json
{
  "id": "clx2222222222222222222222",
  "name": "Dining Chair",
  "description": "Oak dining chair, 2026 line",
  "glbUrl": null,
  "usdzUrl": null,
  "posterUrl": null,
  "status": "PROCESSING",
  "clientId": "clx0000000000000000000000",
  "categoryId": "clx1111111111111111111111",
  "createdAt": "2026-08-19T12:00:00.000Z",
  "updatedAt": "2026-08-19T12:00:00.000Z"
}
```

Error responses are `{ "error": "<message>" }` with status `401`
(missing/wrong bearer token), `400` (`clientId` or `name` missing), or
`404` (`clientId` does not match an existing `Client`).

The new asset starts at `status: "PROCESSING"`; it flips to `"READY"`
once a `.glb` upload completes. Take the returned `id` into the
`uploadAssetFile` step above.

## Known limitations (by design, see the design spec)

- Admin routes are gated by a single shared secret (`ADMIN_API_SECRET`),
  not real authentication.
- **The admin-secret model is not safe for direct browser exposure.**
  `uploadAssetFile` in `lib/upload-client.ts` is a client-side function
  that takes `ADMIN_API_SECRET` as an argument, so any admin UI built on
  top of it must put a real auth layer in front and hand the secret over
  at runtime from a session-gated endpoint — never via a `NEXT_PUBLIC_*`
  env var or a hardcoded constant, both of which are inlined into
  JavaScript served to every visitor and would leak full admin write
  access.
- `ApiKey` records can be created in the schema but aren't enforced
  anywhere yet — reserved for future client-embed auth.
- There is no admin dashboard UI. Asset creation is via `POST /api/assets`
  directly.

Full design rationale: `docs/superpowers/specs/2026-08-19-ar-asset-platform-design.md`.
