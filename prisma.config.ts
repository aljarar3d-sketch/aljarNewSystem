// Prisma 7 removed `datasource.url` / `directUrl` from `schema.prisma` (see
// `prisma/schema.prisma`, which only declares `provider = "postgresql"`) and
// moved connection info for Migrate/introspection commands here instead.
//
// This file is CLI-only. It has no effect on the runtime Prisma Client, which
// is constructed in `lib/prisma.ts` via a `@prisma/adapter-pg` driver adapter
// reading `DATABASE_URL` (the pooled connection string) directly.
//
// The verified shape (`node_modules/@prisma/config/dist/index.d.ts`) exposes
// only `datasource.url` and `datasource.shadowDatabaseUrl` — there is no
// `directUrl` field in the new config API. `url` is what `prisma migrate`/
// `prisma db push`/introspection actually connect with, and those commands
// need a direct (non-pooled) connection: pgbouncer's transaction-pooling mode
// (used by `DATABASE_URL`) doesn't support the session-level features (e.g.
// advisory locks) Migrate relies on. So `url` below is intentionally wired to
// `DIRECT_DATABASE_URL`, not `DATABASE_URL`.
//
// `shadowDatabaseUrl` is left unset: Prisma will create/drop a temporary
// shadow database on the same server as `url` automatically (requires the DB
// user to have CREATEDB) to compute migration diffs during `migrate dev`. If
// your database role can't create databases, add a dedicated shadow database
// URL here.
//
// Unlike older Prisma CLI versions, the config loader does NOT auto-load
// `.env` files, so it's loaded explicitly below (this matches the template
// `prisma init` itself generates for non-Bun runtimes — see
// `node_modules/prisma/build/cli.js`).
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_DATABASE_URL'),
  },
});
