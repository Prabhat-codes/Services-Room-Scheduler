/** Apply SQL migrations in ./drizzle to DATABASE_URL (or the local embedded DB). */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  // On Vercel, only production deploys touch the database schema.
  if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
    console.log(`Skipping migrations for ${process.env.VERCEL_ENV} deploy.`);
    return;
  }
  // A direct/session connection is safest for DDL; fall back to the app's pooled URL.
  const url = process.env.MIGRATION_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    const { connect } = await import("../src/db/connect");
    await connect(); // PGlite auto-migrates on connect
    console.log("Migrated local embedded database (.data/pglite).");
    return;
  }
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { max: 1, prepare: false });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
  console.log("Migrated", new URL(url).host);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
