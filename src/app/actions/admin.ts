"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, requireAdmin, safeEqual, startAdminSession } from "@/lib/session";
import * as m from "@/server/mutations";
import { toError, type ActionResult } from "@/server/result";

export async function adminLogin(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const password = String(form.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return { error: "ADMIN_PASSWORD is not configured on the server." };
  if (!safeEqual(password, expected)) return { error: "That password is incorrect." };
  await startAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await endSession("admin");
  redirect("/admin");
}

/** Run an admin mutation, refresh the page, and turn expected errors into messages. */
async function run<T>(fn: (actor: Awaited<ReturnType<typeof requireAdmin>>) => Promise<T>): Promise<ActionResult<T>> {
  const actor = await requireAdmin();
  try {
    const data = await fn(actor);
    refresh();
    return { ok: true, data };
  } catch (e) {
    return toError(e);
  }
}

export async function saveCompanyAction(input: m.CompanyInputT) {
  return run((a) => m.saveCompany(a, input));
}
export async function deleteCompanyAction(id: number) {
  const r = await run((a) => m.deleteCompany(a, id));
  if (r.ok) redirect("/admin");
  return r;
}
export async function finishCompanyAction(id: number) {
  return run((a) => m.finishCompany(a, id));
}
export async function saveRoomChecklistAction(assignmentId: number, items: m.Item[]) {
  return run((a) => m.saveRoomChecklist(a, assignmentId, items));
}
export async function resetRoomChecklistAction(assignmentId: number) {
  return run((a) => m.resetRoomChecklist(a, assignmentId));
}
export async function resolveCommentAction(id: number, resolved: boolean) {
  return run((a) => m.setCommentResolved(a, id, resolved));
}
export async function adminCommentAction(assignmentId: number, body: string) {
  return run((a) => m.addComment(a, assignmentId, body));
}

export async function createMemberAction(input: unknown) {
  return run((a) => m.createMember(a, input));
}
export async function updateMemberAction(id: number, input: unknown) {
  return run((a) => m.updateMember(a, id, input));
}
export async function deleteMemberAction(id: number) {
  return run((a) => m.deleteMember(a, id));
}

export async function createBuildingAction(input: unknown) {
  return run((a) => m.createBuilding(a, input));
}
export async function updateBuildingAction(id: number, input: unknown) {
  return run((a) => m.updateBuilding(a, id, input));
}
export async function deleteBuildingAction(id: number) {
  return run((a) => m.deleteBuilding(a, id));
}
export async function createRoomsAction(input: unknown) {
  return run((a) => m.createRooms(a, input));
}
export async function updateRoomAction(id: number, input: unknown) {
  return run((a) => m.updateRoom(a, id, input));
}
export async function renameFloorAction(input: unknown) {
  return run((a) => m.renameFloor(a, input));
}
export async function deleteRoomAction(id: number) {
  return run((a) => m.deleteRoom(a, id));
}

export async function createPresetAction(input: unknown) {
  return run((a) => m.createPreset(a, input));
}
export async function updatePresetAction(id: number, input: unknown) {
  return run((a) => m.updatePreset(a, id, input));
}
export async function deletePresetAction(id: number) {
  return run((a) => m.deletePreset(a, id));
}
export async function setLateMinutesAction(minutes: number) {
  return run((a) => m.setLateMinutes(a, minutes));
}
