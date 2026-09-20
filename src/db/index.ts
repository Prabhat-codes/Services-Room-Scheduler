import "server-only";
import { connect, type DB } from "./connect";
import * as schema from "./schema";

declare global {
  var __roomCheckerDb: Promise<DB> | undefined;
}

export function getDb(): Promise<DB> {
  globalThis.__roomCheckerDb ??= connect();
  return globalThis.__roomCheckerDb;
}

export { schema, type DB };
