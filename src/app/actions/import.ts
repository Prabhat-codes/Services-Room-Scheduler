"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { applyImport, planImport, readSheet, type ImportPlan } from "@/server/import";
import { toError, type ActionResult } from "@/server/result";
import type { ProcessMode } from "@/db/schema";

/** Read an uploaded sheet and work out what it would create. Nothing is saved yet. */
export async function previewImportAction(form: FormData): Promise<ActionResult<ImportPlan>> {
  await requireAdmin();
  try {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a spreadsheet first." };
    if (file.size > 5_000_000) return { ok: false, error: "That file is over 5 MB. Trim it and try again." };
    const date = String(form.get("date") ?? "");
    const mode = (String(form.get("mode") ?? "offline") as ProcessMode) ?? "offline";
    const rows = await readSheet(await file.arrayBuffer(), date);
    return { ok: true, data: await planImport(rows, mode) };
  } catch (e) {
    return toError(e);
  }
}

export async function applyImportAction(plan: ImportPlan): Promise<ActionResult<{ companies: number; updated: number; slots: number; rooms: number }>> {
  const actor = await requireAdmin();
  try {
    const created = await applyImport(actor, plan);
    refresh();
    return { ok: true, data: created };
  } catch (e) {
    return toError(e);
  }
}
