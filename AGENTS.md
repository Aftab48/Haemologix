# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

HaemoLogix is a Next.js 15 (App Router, Turbopack) full-stack blood donation management platform. See `README.md` for full architecture details.

### Services

| Service | How to run | Port | Notes |
|---|---|---|---|
| Next.js app | `npm run dev` | 3000 | Main application (frontend + backend) |
| PostgreSQL | System service (`sudo pg_ctlcluster 16 main start`) | 5432 | Must be running before Prisma operations |

### Environment variables

All required secrets (`DATABASE_URL`, `CLERK_SECRET_KEY`, AWS, Twilio, SMTP, etc.) are injected as environment variables by the Cloud Agent VM. `NEXT_PUBLIC_*` variables are written to `.env.local` for Next.js client-side bundling. The `.env.local` file is **not** committed; it must be regenerated from environment variables on setup.

### Common commands

- **Install deps**: `npm install` (also runs `prisma generate` via postinstall)
- **Dev server**: `npm run dev` (uses Turbopack)
- **Lint**: `npm run lint` (ESLint, warnings only - 0 errors expected)
- **Build**: `npm run build` (known pre-existing failure on `/admin/feedback` page due to `prisma` vs `db` import mismatch in `@/db`)
- **Prisma schema push**: `npx prisma db push`

### Gotchas

- **Prisma reads env differently than Next.js**: When running `npx prisma` directly, it reads `DATABASE_URL` from the shell environment (or `.env`), not from `.env.local`. The Cloud VM injects `DATABASE_URL` as a shell env var, so this works. But if you create a `.env` file, Prisma will prefer it over the shell env.
- **Clerk auth required**: The app uses Clerk middleware on all routes. Public routes (homepage, `/api/*`, `/demo/*`, registration pages) work without login, but most donor/hospital/admin pages require Clerk authentication.
- **`npm run build` fails**: There is a pre-existing bug where `app/api/feedback/route.ts` and related files import `prisma` from `@/db`, but `db/index.ts` exports `db` (not `prisma`). This causes static generation to fail. The dev server is unaffected since it compiles on demand.
- **PostgreSQL must be started manually**: Run `sudo pg_ctlcluster 16 main start` before any Prisma database operations if using local PostgreSQL. The Cloud VM's `DATABASE_URL` typically points to a remote NeonDB instance, making local PostgreSQL optional.
