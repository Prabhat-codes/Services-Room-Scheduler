import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

/** Network blips and pooler-dropped sockets, all worth one more go. */
const TRANSIENT = new Set(["ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "ECONNREFUSED", "EPIPE", "EAI_AGAIN", "CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECT_TIMEOUT", "EMAXCONNSESSION"]);

function isTransient(e: unknown): boolean {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const text = `${err?.message ?? ""} ${err?.cause?.message ?? ""}`;
  // "max clients reached" arrives as a plain Postgres XX000 error.
  return TRANSIENT.has(err?.code ?? "") || TRANSIENT.has(err?.cause?.code ?? "") || /max clients reached/i.test(text);
}

/**
 * Retry reads that fail because the connection died under them. Drizzle runs every
 * query through `client.unsafe(...)`, either awaited directly or via `.values()`,
 * so wrapping that one method covers them all. Transactions are left alone: a write
 * should surface its error rather than run twice.
 */
function withRetry(client: Sql): Sql {
  const attempt = async <T>(run: () => Promise<T>): Promise<T> => {
    for (let i = 0; ; i++) {
      try {
        return await run();
      } catch (e) {
        if (i >= 3 || !isTransient(e)) throw e;
        await new Promise((r) => setTimeout(r, 120 * (i + 1) + Math.random() * 120));
      }
    }
  };

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop !== "unsafe") return Reflect.get(target, prop, receiver);
      return (query: string, params: unknown[]) => ({
        values: () => attempt(() => target.unsafe(query, params as never).values()),
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => attempt(() => target.unsafe(query, params as never)).then(res, rej),
      });
    },
  }) as Sql;
}

/**
 * Supabase's transaction pooler (port 6543) cannot serve this app at all: the driver
 * pipelines a page's queries down one connection and that pooler stalls on them, even
 * for a single visitor. The session pooler (5432) handles the same load in ~500ms, so
 * a 6543 URL is redirected there.
 */
export function appUrl() {
  const main = process.env.DATABASE_URL;
  const session = process.env.MIGRATION_DATABASE_URL || process.env.DIRECT_URL;
  if (!main?.includes(":6543")) return main;
  if (session) return session;
  // Same host and credentials, session-pooler port, and pgbouncer mode dropped.
  return main.replace(":6543", ":5432").replace(/[?&]pgbouncer=true/, "");
}

/**
 * Production: postgres-js against the Supabase session pooler.
 * Local dev without DATABASE_URL: embedded PGlite in .data/pglite, auto-migrated.
 */
export async function connect(): Promise<DB> {
  const url = appUrl();
  if (url) {
    // Supabase's free pooler allows 15 connections in total, and in session mode a
    // client holds one for its whole life. Serverless spreads requests over many
    // instances, so each takes a single connection and hands it back quickly; pages
    // query one step at a time so one connection is enough.
    const client = postgres(url, {
      prepare: false,
      max: 1,
      idle_timeout: 5,
      max_lifetime: 60 * 10,
      connect_timeout: 15,
    });
    return drizzlePg(withRetry(client), { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  (await import("node:fs")).mkdirSync(".data", { recursive: true });
  const client = new PGlite(".data/pglite");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  // PGlite shares the query-builder API; the cast keeps one DB type across drivers.
  return db as unknown as DB;
}
