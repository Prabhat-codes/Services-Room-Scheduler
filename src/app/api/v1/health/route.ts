import { api } from "@/server/api";
import { getDb, schema as s } from "@/db";
import { appUrl } from "@/db/connect";
import { count } from "drizzle-orm";

/** Diagnostics: is the database reachable, how fast, and over which pooler port. */
export const GET = api(async () => {
  const port = (appUrl() ?? "").match(/:(\d{4})\//)?.[1] ?? "embedded";
  const started = Date.now();
  try {
    const db = await getDb();
    const [row] = await db.select({ n: count() }).from(s.members);
    return { ok: true, members: row.n, ms: Date.now() - started, port };
  } catch (e) {
    const err = e as { code?: string; message: string; cause?: { code?: string; message?: string } };
    return {
      ok: false,
      ms: Date.now() - started,
      port,
      code: err.code ?? err.cause?.code ?? null,
      message: (err.cause?.message ?? err.message).slice(0, 300),
    };
  }
});
