import { api, API_ACTOR } from "@/server/api";
import { applyImport, planImport, readSheet } from "@/server/import";
import { dayKey } from "@/lib/time";
import { UserError } from "@/server/types";
import type { ProcessMode } from "@/db/schema";

/**
 * Multipart upload of a room-allocation sheet.
 * Fields: file (.xlsx), date (fallback for rows without one), mode, apply ("1" to create).
 * Without `apply` it only reports what it would create.
 */
export const POST = api(async (req) => {
  const form = await req.formData().catch(() => {
    throw new UserError("Send the sheet as multipart form data, with the file in a `file` field.");
  });
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) throw new UserError("Attach the sheet as the `file` field.");
  const date = String(form.get("date") ?? "") || dayKey(new Date());
  const mode = (String(form.get("mode") ?? "offline") as ProcessMode) || "offline";
  const rows = await readSheet(await file.arrayBuffer(), date);
  const plan = await planImport(rows, mode);
  if (String(form.get("apply") ?? "") !== "1") return { applied: false, ...plan };
  const created = await applyImport(API_ACTOR, plan);
  return { applied: true, created, problems: plan.problems };
});
