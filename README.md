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
   - `NEXT_PUBLIC_SITE_URL` — your deployment's public origin, used to
     build the QR code target URL.
2. Push the schema to your real database:
   ```bash
   npx prisma migrate dev --name init
   ```
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

1. Seed a client directly (no admin UI yet):
   ```bash
   npx tsx scripts/create-test-asset.ts
   ```
   This creates a `Client` and an `Asset` row and prints the new
   `assetId`.
2. Upload a real `.glb` file for that asset using `uploadAssetFile`
   from `lib/upload-client.ts` (wire it up to a temporary `<input type="file">`
   page, or call `/api/assets` + the Blob `upload()` flow manually) —
   there is no admin UI yet, so this step is code, not clicking.
3. Visit `/ar/<assetId>` and confirm the model renders and the QR code
   resolves back to the same page from a phone.

## Known limitations (by design, see the design spec)

- Admin routes are gated by a single shared secret (`ADMIN_API_SECRET`),
  not real authentication.
- `ApiKey` records can be created in the schema but aren't enforced
  anywhere yet — reserved for future client-embed auth.
- There is no admin dashboard UI. Asset creation is via `POST /api/assets`
  directly.

Full design rationale: `docs/superpowers/specs/2026-08-19-ar-asset-platform-design.md`.
