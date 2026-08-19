# AR Asset Management Platform — Design Spec

Date: 2026-08-19
Status: Approved — proceeding to implementation

## Purpose

A B2B internal admin tool for managing 3D/AR assets on behalf of clients.
Staff upload `.glb`/`.usdz` model files per client, organized into
categories; each asset gets a permanent public AR-viewer URL and a QR
code, suitable for print/packaging use (scan → view the model in AR on
a phone). Reference UX inspiration: https://ar.gamisya.com/ar-viewer
(QR-based sharing, GLB for cross-device compatibility, USDZ for iOS
Quick Look, environment/lighting controls in the viewer).

## Scope

In scope for this build:
- Prisma schema: `Client`, `Category`, `Asset`, `ApiKey`.
- Vercel Blob client-side upload pipeline (bypasses the 4.5MB Next.js
  serverless function body limit).
- Public AR viewer page + `<model-viewer>`-based component.
- QR code component pointing at the asset's permanent public URL.
- Minimal shared-secret gating on the admin-only API routes.

Explicitly out of scope for this build (documented as follow-ups):
- A real admin authentication system (login/sessions) — a single
  bearer-token env var stands in for now.
- `ApiKey` enforcement middleware for client-side embed auth — the
  model exists so the feature can be added later, but the public
  viewer route does not check it yet.
- Any admin CRUD dashboard UI (client/category/asset management
  screens). This build produces the schema, API routes, and viewer/QR
  components only.

## Decisions from brainstorming

- **Access model**: internal admin tool. Staff manage all clients'
  assets; clients don't log in themselves.
- **API Key purpose**: reserved for future client-side embed auth
  (a client embeds the viewer/fetches their assets on their own site).
  Not enforced in this build.
- **Public viewer URL**: permanent, no expiry — matches the print/QR
  use case where the code must always resolve (unlike the reference
  site's 48-hour expiring codes).
- **Postgres host**: Vercel Postgres (Neon-backed).

## Data model

```prisma
model Client {
  id           String     @id @default(cuid())
  name         String
  slug         String     @unique
  contactEmail String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  categories   Category[]
  assets       Asset[]
  apiKeys      ApiKey[]
}

model Category {
  id        String   @id @default(cuid())
  name      String
  slug      String
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  assets    Asset[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([clientId, slug])
}

enum AssetStatus { PROCESSING READY FAILED }

model Asset {
  id          String      @id @default(cuid())   // also the public /ar/[id] segment
  name        String
  description String?
  glbUrl      String?
  usdzUrl     String?
  posterUrl   String?
  status      AssetStatus @default(PROCESSING)
  clientId    String
  client      Client      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  categoryId  String?
  category    Category?   @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([clientId])
  @@index([categoryId])
}

model ApiKey {
  id         String    @id @default(cuid())
  label      String
  keyHash    String    @unique   // sha256 of the raw key; raw key shown once at creation
  keyPrefix  String              // first 8 chars, for display/lookup
  clientId   String
  client     Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([clientId])
}
```

`Asset.id` (a cuid, unguessable) doubles as the public viewer URL
segment — no separate slug is needed. `status` exists because the Blob
upload is client-side and completes asynchronously relative to the
`Asset` row's creation.

## Upload pipeline (Vercel Blob client-side upload)

Two-step flow, so the browser can upload directly to Blob storage
(bypassing the serverless body-size limit) while still tying the file
to the right `Asset` record:

1. `POST /api/assets` creates the `Asset` row (`status: PROCESSING`,
   no URLs yet) and returns its `id`. Gated by the admin bearer
   secret.
2. The browser calls `upload()` from `@vercel/blob/client`, targeting
   `/api/upload`, with `clientPayload: JSON.stringify({ assetId, fileType })`
   where `fileType` is `"glb"` or `"usdz"`. Bytes go straight to Blob
   storage, never through a Next.js function body.
3. `/api/upload` implements `handleUpload` from `@vercel/blob/client`:
   - `onBeforeGenerateToken`: verifies the admin bearer secret,
     validates `assetId` exists and `fileType` is `glb`/`usdz`,
     restricts `allowedContentTypes` accordingly
     (`model/gltf-binary` for glb, `model/vnd.usdz+zip` for usdz),
     caps size at 100MB.
   - `onUploadCompleted`: parses the payload, `PATCH`es the `Asset`
     row's `glbUrl`/`usdzUrl`, sets `status` to `READY` once `glbUrl`
     is present (usdz is optional — GLB alone is enough for a working
     viewer; usdz upgrades the iOS AR experience).

## Viewer + QR

- `app/ar/[assetId]/page.tsx` — server component. Fetches the `Asset`
  by id; returns 404 if missing or `status !== "READY"`.
- `components/ArViewer.tsx` — client component wrapping
  `@google/model-viewer`:
  `src={glbUrl}` `ios-src={usdzUrl}` `ar ar-modes="webxr scene-viewer quick-look"`
  `camera-controls auto-rotate poster={posterUrl}`.
- `components/AssetQrCode.tsx` — `qrcode.react`'s `QRCodeSVG` pointed
  at the asset's own canonical URL. Rendered on the viewer page itself
  as a "scan to open on your phone" panel, since AR requires a phone
  camera and a desktop visitor needs a bridge to mobile. Built as a
  standalone reusable component so a future admin dashboard can reuse
  it (e.g. to show/print the QR right after upload).

## Error handling

- Upload: reject wrong extension/mime both client- and server-side;
  size cap enforced in `onBeforeGenerateToken`; surface failures
  inline in the upload UI. If `onUploadCompleted` never fires (e.g.
  webhook delivery failure), the `Asset` stays `PROCESSING` —
  acceptable for this build; a manual "mark failed"/retry affordance
  is a follow-up once the admin dashboard exists.
- Viewer: 404 page when the asset is missing or not `READY`;
  `<model-viewer>`'s built-in error slot handles model load failures
  (e.g. malformed GLB).

## Testing plan

- `prisma validate` / `prisma migrate dev` to confirm the schema.
- Unit test for the `onBeforeGenerateToken` validation logic, factored
  out as a pure function (asset-exists check, fileType/content-type
  matching, size cap).
- `tsc --noEmit` and `next build` for type/build safety.
- Manual verification: run the dev server, upload a real `.glb`
  through the flow, confirm the `/ar/[assetId]` page renders it and
  the QR resolves to the same page.

## Follow-ups (explicitly deferred)

- Real admin auth (replace the bearer-secret stub).
- `ApiKey` issuance/verification middleware for client-side embed use.
- Admin dashboard UI (Client/Category/Asset/ApiKey CRUD screens).
- Asset `FAILED` recovery/retry UX.
