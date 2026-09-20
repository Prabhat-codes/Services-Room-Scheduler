# Room Checker

Room readiness for the placement services committee. The admin schedules companies into rooms with a checklist; runners on the ground tick items off on their phones and mark each room ready before the recruiter arrives.

- **Runners** open `/`, pick their name, and sign in with their roll number.
- **Admin** opens `/admin` and signs in with the admin password.

## How it works

| Concept | Meaning |
|---|---|
| Company | Name, SPOC (name + phone), process (in person / online / hybrid), note for runners |
| Slot | A time window for a company. A company can have several slots across days, each with its own rooms |
| Room in a slot | What a runner prepares. It gets a copy of the company checklist, or its own list if the admin customised it |
| Ready | A runner presses **All done** once every item is ticked. Unticking anything, or the admin adding an item, makes it not ready again |
| Red | A room that isn't ready within the warning window (default 30 min, set in **Setup**) before its slot starts |
| Past | A company moves to Past once its last slot ends, or when the admin presses **Mark finished** |

Every tick, ready, comment and admin change is logged with who did it (**Admin > Activity**).

## Local development

```bash
npm install
npm run db:seed -- --demo   # buildings, rooms, 53 members, checklist tiles + example companies
npm run dev
```

With `DATABASE_URL` empty, the app uses an embedded Postgres (PGlite) stored in `.data/pglite`, so no database server is needed locally. Stop `npm run dev` before running `db:seed` against it (PGlite allows one process at a time). Delete `.data/` to start fresh.

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Password for `/admin` |
| `SESSION_SECRET` | Random string used to sign login cookies |
| `ADMIN_API_KEY` | Bearer token for the REST API |
| `DATABASE_URL` | Postgres URL. Empty locally; in production the Supabase **session pooler** URL (port 5432) |
| `DIRECT_URL` (or `MIGRATION_DATABASE_URL`) | Supabase **session pooler** URL (port 5432), used for schema migrations |

> **Use the session pooler, not the transaction pooler.** Pages here run several queries at once, and Supabase's transaction pooler (port 6543) deadlocks under that, while the session pooler (5432) serves 16 simultaneous page loads in under half a second. If `DATABASE_URL` still points at 6543, the app falls back to `DIRECT_URL` automatically. Diagnose a slow or stuck database with `GET /api/v1/health`, `npx tsx scripts/dbcheck.ts`, or `npx tsx scripts/conns.ts` (who is holding the 15 connections).

## Database changes

Schema lives in `src/db/schema.ts` (Drizzle ORM).

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` writes a SQL migration into `drizzle/`.
3. Commit both. On the next production deploy, Vercel runs `npm run vercel-build`, which applies pending migrations before building. Preview deploys skip migrations.

CI fails if the schema changes without a matching migration.

## Deploying (Vercel + Supabase + GitHub)

1. Create a Supabase project in the Mumbai region. From **Connect**, copy the transaction pooler URI (port 6543) and the session pooler URI (port 5432).
2. Push this repo to GitHub and import it in Vercel. Set the environment variables above for Production (and Preview if you want previews to work against a database).
3. Seed once from your machine: `DATABASE_URL=<session pooler url> npm run db:seed`.
4. From then on, every push to `main` deploys to production and every pull request gets a preview URL. GitHub Actions runs lint, type-check, the migration check and a build on each push.

## REST API

All endpoints need `Authorization: Bearer $ADMIN_API_KEY` (or an admin session cookie). JSON in, JSON out. Errors return `{ "error": "..." }` with status 400, or 401 without auth.

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/v1/board` | Live status of every company, slot and room |
| GET, POST | `/api/v1/companies` | POST `{ name, spocName, spocPhone, mode, notes, items: [{label, group, qty}], slots: [{startsAt, endsAt, roomIds}], force? }`. Returns 409 with `conflicts` if rooms are double-booked |
| GET, PUT, DELETE | `/api/v1/companies/:id` | PUT takes the same shape as POST; keep slot `id`s to preserve ticks |
| GET, POST | `/api/v1/members` | `{ name, rollNumber, active? }` |
| PATCH, DELETE | `/api/v1/members/:id` | |
| GET, POST | `/api/v1/buildings` | `{ name, sort? }` |
| PATCH, DELETE | `/api/v1/buildings/:id` | |
| GET, POST | `/api/v1/rooms` | `{ buildingId, floor, numbers: "41-46, 50" }` |
| PATCH, DELETE | `/api/v1/rooms/:id` | `{ number?, buildingId?, floor?, active? }`; moving buildings or floors is a PATCH |
| PATCH | `/api/v1/floors` | Rename a floor in one building: `{ buildingId, from, to }` |
| GET, POST | `/api/v1/presets` | Checklist tiles: `{ label, group?, defaultQty?, modes? }` |
| PATCH, DELETE | `/api/v1/presets/:id` | |
| GET | `/api/v1/comments?show=open` | `open`, `resolved` or `all` |
| PATCH | `/api/v1/comments/:id` | `{ resolved: true }` |
| GET, PUT | `/api/v1/settings` | `{ lateMinutes }` |
| GET | `/api/v1/activity?limit=300` | Audit log |
| GET | `/api/v1/health` | Database reachable, round-trip ms, pooler port in use |

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" https://<your-app>.vercel.app/api/v1/board
```
