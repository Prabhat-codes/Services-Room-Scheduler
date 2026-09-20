import { ZodError } from "zod";
import { UserError } from "./types";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Turn expected failures into a message the UI can show; let real bugs throw. */
export function toError(e: unknown): { ok: false; error: string } {
  if (e instanceof UserError) return { ok: false, error: e.message };
  if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form and try again." };
  throw e;
}
