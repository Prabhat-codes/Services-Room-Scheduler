"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { endSession, requireRunner, startRunnerSession } from "@/lib/session";
import { addComment, markRoomReady, setTaskDone } from "@/server/mutations";
import { toError, type ActionResult } from "@/server/result";

export type LoginState = { error?: string; memberId?: string };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const memberId = String(form.get("memberId") ?? "");
  const roll = String(form.get("roll") ?? "").trim();
  if (!memberId) return { error: "Pick your name from the list." };
  if (!roll) return { error: "Enter your password.", memberId };
  const db = await getDb();
  // Case-insensitive on both sides: typing b25031 or B25031 both work.
  const [m] = await db
    .select()
    .from(s.members)
    .where(and(eq(s.members.id, Number(memberId)), eq(s.members.active, true), sql`upper(${s.members.rollNumber}) = ${roll.toUpperCase()}`));
  if (!m) return { error: "That password doesn’t match the name you picked. Check both and try again.", memberId };
  await startRunnerSession(m.id, m.name);
  redirect("/companies");
}

export async function logout() {
  await endSession("runner");
  redirect("/");
}

export async function toggleTask(taskId: number, done: boolean): Promise<ActionResult> {
  const actor = await requireRunner();
  try {
    await setTaskDone(actor, taskId, done);
    refresh();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function markReady(assignmentId: number): Promise<ActionResult> {
  const actor = await requireRunner();
  try {
    await markRoomReady(actor, assignmentId);
    refresh();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function postComment(assignmentId: number, body: string): Promise<ActionResult> {
  const actor = await requireRunner();
  try {
    await addComment(actor, assignmentId, body);
    refresh();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function toggleTasks(taskIds: number[], done: boolean): Promise<ActionResult> {
  const actor = await requireRunner();
  try {
    for (const id of taskIds) await setTaskDone(actor, id, done);
    refresh();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}
