import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

/**
 * Production: postgres-js against DATABASE_URL (Supabase pooler).
 * Local dev without DATABASE_URL: embedded PGlite in .data/pglite, auto-migrated.
 */
export async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false, max: 5 });
    return drizzlePg(client, { schema });
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
