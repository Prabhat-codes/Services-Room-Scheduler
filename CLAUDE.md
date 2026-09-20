@AGENTS.md

# Room Checker

Phone-first room-readiness tool for a placement services committee. See README.md for the domain model, env vars and API.

## Commands

- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck` (run `npx next typegen` first if route types are missing)
- `npm run db:generate` after editing `src/db/schema.ts`; commit the new file in `drizzle/`
- `npm run db:seed` (add `-- --demo` for example companies). Stop the dev server first when using the local PGlite DB

## Layout

- `src/db/` schema and connection (postgres-js in prod, PGlite locally when `DATABASE_URL` is empty)
- `src/server/board.ts` read model and status rules (`roomStatus`, `companyStatus`)
- `src/server/mutations.ts` every write, with zod validation and an activity-log entry; shared by server actions (`src/app/actions/`) and the REST API (`src/app/api/v1/`)
- `src/app/companies/**` runner UI; `src/app/admin/**` admin UI; `src/proxy.ts` is the route guard (Next 16 renamed middleware to proxy)

## Conventions

- All times are stored UTC and shown in IST via `src/lib/time.ts`.
- Status colour comes from `data-status` + the tone variables in `globals.css`; never hard-code status colours. Always pair colour with words.
- Design: Big Shoulders (display, room numbers, company names) + Atkinson Hyperlegible Next (body). Room tiles use the `.plate` door-sign style. Sentence case, no all-caps labels.
- Data changes against production: prefer the REST API with `ADMIN_API_KEY`; schema changes go through Drizzle migrations only.
