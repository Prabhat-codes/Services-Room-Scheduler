import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

async function main() {
  const url = (process.env.DIRECT_URL ?? process.env.DATABASE_URL!).replace(":6543", ":5432");
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
  const rows = await sql`
    select application_name, state, count(*)::int as n, min(now() - state_change)::text as oldest
    from pg_stat_activity
    where datname = current_database()
    group by 1, 2
    order by n desc`;
  console.table(rows);
  const [{ total }] = await sql`select count(*)::int as total from pg_stat_activity where datname = current_database()`;
  console.log("total backend connections:", total);
  await sql.end({ timeout: 5 });
  process.exit(0);
}
main();
