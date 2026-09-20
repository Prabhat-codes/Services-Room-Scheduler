import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

async function check(label: string, url?: string) {
  if (!url) return console.log(label, "not set");
  const t0 = Date.now();
  try {
    const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 20 });
    const [row] = await sql`select count(*)::int as n from members`;
    console.log(label, "OK:", row.n, "members in", Date.now() - t0, "ms");
    await sql.end({ timeout: 5 });
  } catch (e) {
    console.log(label, "FAILED in", Date.now() - t0, "ms:", (e as { code?: string; message: string }).code ?? (e as Error).message);
  }
}

async function main() {
  await check("pooler 6543", process.env.DATABASE_URL);
  await check("session 5432", process.env.DIRECT_URL);
  process.exit(0);
}

main();
