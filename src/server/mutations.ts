import "server-only";
import { and, eq, gt, inArray, isNull, lt, ne, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s, type DB } from "@/db";
import { fmtRange } from "@/lib/time";
import { UserError, type Actor } from "./types";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Q = DB | Tx;

async function log(
  db: Q,
  actor: Actor,
  action: string,
  summary: string,
  refs: { companyId?: number | null; assignmentId?: number | null } = {},
) {
  await db.insert(s.activity).values({
    actorName: actor.name,
    memberId: actor.kind === "member" ? actor.id : null,
    action,
    summary,
    companyId: refs.companyId ?? null,
    assignmentId: refs.assignmentId ?? null,
  });
}

/** Company + room label for log lines. */
async function assignmentContext(db: Q, assignmentId: number) {
  const [row] = await db
    .select({ companyId: s.companies.id, company: s.companies.name, room: s.rooms.number, building: s.buildings.name })
    .from(s.assignments)
    .innerJoin(s.slots, eq(s.slots.id, s.assignments.slotId))
    .innerJoin(s.companies, eq(s.companies.id, s.slots.companyId))
    .innerJoin(s.rooms, eq(s.rooms.id, s.assignments.roomId))
    .innerJoin(s.buildings, eq(s.buildings.id, s.rooms.buildingId))
    .where(eq(s.assignments.id, assignmentId));
  if (!row) throw new UserError("That room is no longer on the schedule.");
  return { ...row, label: `${row.building} ${row.room}` };
}

/* ───────────────────────── Runner actions ───────────────────────── */

export async function setTaskDone(actor: Actor, taskId: number, done: boolean) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [task] = await tx.select().from(s.tasks).where(eq(s.tasks.id, taskId));
    if (!task) throw new UserError("That item was removed by the admin. Refresh to see the latest list.");
    await tx
      .update(s.tasks)
      .set(done ? { doneAt: new Date(), doneById: actor.id } : { doneAt: null, doneById: null })
      .where(eq(s.tasks.id, taskId));
    const ctx = await assignmentContext(tx, task.assignmentId);
    if (!done) {
      const reopened = await tx
        .update(s.assignments)
        .set({ doneAt: null, doneById: null })
        .where(and(eq(s.assignments.id, task.assignmentId), sql`${s.assignments.doneAt} is not null`))
        .returning({ id: s.assignments.id });
      if (reopened.length)
        await log(tx, actor, "room.reopened", `${ctx.label} for ${ctx.company} is no longer ready (unticked ${task.label})`, {
          companyId: ctx.companyId,
          assignmentId: task.assignmentId,
        });
    }
    await log(tx, actor, done ? "task.ticked" : "task.unticked", `${done ? "Ticked" : "Unticked"} ${task.label} in ${ctx.label} for ${ctx.company}`, {
      companyId: ctx.companyId,
      assignmentId: task.assignmentId,
    });
  });
}

export async function markRoomReady(actor: Actor, assignmentId: number) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [open] = await tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(s.tasks)
      .where(and(eq(s.tasks.assignmentId, assignmentId), isNull(s.tasks.doneAt)));
    if (open.n > 0) throw new UserError(`${open.n} item${open.n === 1 ? " is" : "s are"} still unticked. Tick everything before marking the room ready.`);
    const ctx = await assignmentContext(tx, assignmentId);
    await tx.update(s.assignments).set({ doneAt: new Date(), doneById: actor.id }).where(eq(s.assignments.id, assignmentId));
    await log(tx, actor, "room.ready", `Marked ${ctx.label} ready for ${ctx.company}`, { companyId: ctx.companyId, assignmentId });
  });
}

export const CommentInput = z.object({ body: z.string().trim().min(1, "Write something first.").max(1000) });

export async function addComment(actor: Actor, assignmentId: number, body: string) {
  const db = await getDb();
  const input = CommentInput.parse({ body });
  const ctx = await assignmentContext(db, assignmentId);
  // Admin notes are informational, so they never count as open issues.
  await db.insert(s.comments).values({
    assignmentId,
    memberId: actor.id,
    authorName: actor.name,
    body: input.body,
    resolvedAt: actor.kind === "admin" ? new Date() : null,
  });
  await log(db, actor, "comment.added", `Commented on ${ctx.label} for ${ctx.company}: “${input.body.slice(0, 80)}”`, {
    companyId: ctx.companyId,
    assignmentId,
  });
}

export async function setCommentResolved(actor: Actor, commentId: number, resolved: boolean) {
  const db = await getDb();
  const [c] = await db
    .update(s.comments)
    .set({ resolvedAt: resolved ? new Date() : null })
    .where(eq(s.comments.id, commentId))
    .returning();
  if (!c) throw new UserError("Comment not found.");
  const ctx = await assignmentContext(db, c.assignmentId);
  await log(db, actor, resolved ? "comment.resolved" : "comment.reopened", `${resolved ? "Resolved" : "Reopened"} a comment on ${ctx.label} for ${ctx.company}`, {
    companyId: ctx.companyId,
    assignmentId: c.assignmentId,
  });
}

/* ───────────────────────── Checklists ───────────────────────── */

export const ItemInput = z.object({
  label: z.string().trim().min(1).max(80),
  group: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((g) => g || null),
  qty: z.number().int().positive().max(999).nullish().transform((q) => q ?? null),
  note: z.string().trim().max(200).default(""),
});
export type Item = z.infer<typeof ItemInput>;

const itemKey = (i: { label: string; group: string | null }) => `${i.group ?? ""}|${i.label.trim().toLowerCase()}`;

function dedupe(items: Item[]) {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(itemKey(i)) ? false : (seen.add(itemKey(i)), true)));
}

/** Make a room's tasks match `items`, keeping ticks on items that stay. New items re-open a ready room. */
async function syncTasks(tx: Q, assignmentId: number, items: Item[]) {
  const existing = await tx.select().from(s.tasks).where(eq(s.tasks.assignmentId, assignmentId));
  const byKey = new Map(existing.map((t) => [itemKey(t), t]));
  const keep = new Set<number>();
  let added = 0;
  for (const [sort, item] of items.entries()) {
    const found = byKey.get(itemKey(item));
    if (found) {
      keep.add(found.id);
      if (found.qty !== item.qty || found.note !== item.note || found.sort !== sort || found.label !== item.label)
        await tx.update(s.tasks).set({ qty: item.qty, note: item.note, sort, label: item.label }).where(eq(s.tasks.id, found.id));
    } else {
      await tx.insert(s.tasks).values({ assignmentId, ...item, sort });
      added++;
    }
  }
  const drop = existing.filter((t) => !keep.has(t.id)).map((t) => t.id);
  if (drop.length) await tx.delete(s.tasks).where(inArray(s.tasks.id, drop));
  if (added) await tx.update(s.assignments).set({ doneAt: null, doneById: null }).where(eq(s.assignments.id, assignmentId));
}

async function companyItems(tx: Q, companyId: number): Promise<Item[]> {
  const rows = await tx.select().from(s.companyItems).where(eq(s.companyItems.companyId, companyId)).orderBy(s.companyItems.sort);
  return rows.map(({ label, group, qty, note }) => ({ label, group, qty, note }));
}

/** Give one room its own checklist (e.g. the online room in a hybrid process). */
export async function saveRoomChecklist(actor: Actor, assignmentId: number, raw: unknown) {
  const items = dedupe(z.array(ItemInput).min(1, "A room needs at least one item.").parse(raw));
  const db = await getDb();
  await db.transaction(async (tx) => {
    const ctx = await assignmentContext(tx, assignmentId);
    await tx.update(s.assignments).set({ customized: true }).where(eq(s.assignments.id, assignmentId));
    await syncTasks(tx, assignmentId, items);
    await log(tx, actor, "room.customized", `Customised the checklist for ${ctx.label} (${ctx.company})`, { companyId: ctx.companyId, assignmentId });
  });
}

export async function resetRoomChecklist(actor: Actor, assignmentId: number) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const ctx = await assignmentContext(tx, assignmentId);
    await tx.update(s.assignments).set({ customized: false }).where(eq(s.assignments.id, assignmentId));
    await syncTasks(tx, assignmentId, await companyItems(tx, ctx.companyId));
    await log(tx, actor, "room.reset", `Reset ${ctx.label} to the company checklist (${ctx.company})`, { companyId: ctx.companyId, assignmentId });
  });
}

/* ───────────────────────── Companies ───────────────────────── */

export const CompanyInput = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1, "Company name is required.").max(120),
  spocName: z.string().trim().max(120).default(""),
  spocPhone: z.string().trim().max(40).default(""),
  mode: z.enum(["offline", "online", "hybrid"]),
  notes: z.string().trim().max(2000).default(""),
  items: z.array(ItemInput).min(1, "Pick at least one checklist item."),
  slots: z
    .array(
      z
        .object({
          id: z.number().int().optional(),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
          roomIds: z.array(z.number().int()).min(1, "Every time slot needs at least one room."),
        })
        .refine((sl) => sl.endsAt > sl.startsAt, "A slot must end after it starts."),
    )
    .min(1, "Add at least one time slot."),
  /** Save even if rooms are double-booked. */
  force: z.boolean().optional(),
});
export type CompanyInputT = z.input<typeof CompanyInput>;

export type Conflict = { roomId: number; room: string; company: string; startsAt: Date; endsAt: Date };
export type SaveCompanyResult = { ok: true; id: number } | { ok: false; conflicts: Conflict[] };

async function findConflicts(db: Q, companyId: number | undefined, slots: z.infer<typeof CompanyInput>["slots"]) {
  const out: Conflict[] = [];
  for (const sl of slots) {
    const rows = await db
      .select({
        roomId: s.rooms.id,
        room: sql<string>`${s.buildings.name} || ' ' || ${s.rooms.number}`,
        company: s.companies.name,
        startsAt: s.slots.startsAt,
        endsAt: s.slots.endsAt,
      })
      .from(s.assignments)
      .innerJoin(s.slots, eq(s.slots.id, s.assignments.slotId))
      .innerJoin(s.companies, eq(s.companies.id, s.slots.companyId))
      .innerJoin(s.rooms, eq(s.rooms.id, s.assignments.roomId))
      .innerJoin(s.buildings, eq(s.buildings.id, s.rooms.buildingId))
      .where(
        and(
          inArray(s.assignments.roomId, sl.roomIds),
          lt(s.slots.startsAt, sl.endsAt),
          gt(s.slots.endsAt, sl.startsAt),
          companyId ? ne(s.companies.id, companyId) : undefined,
        ),
      );
    out.push(...rows);
  }
  return out;
}

export async function saveCompany(actor: Actor, raw: unknown): Promise<SaveCompanyResult> {
  const input = CompanyInput.parse(raw);
  const items = dedupe(input.items);
  const db = await getDb();

  if (!input.force) {
    const conflicts = await findConflicts(db, input.id, input.slots);
    if (conflicts.length) return { ok: false, conflicts };
  }

  const id = await db.transaction(async (tx) => {
    const fields = { name: input.name, spocName: input.spocName, spocPhone: input.spocPhone, mode: input.mode, notes: input.notes };
    let companyId: number;
    if (input.id) {
      const [row] = await tx.update(s.companies).set({ ...fields, updatedAt: new Date() }).where(eq(s.companies.id, input.id)).returning();
      if (!row) throw new UserError("That company no longer exists.");
      companyId = row.id;
    } else {
      [{ id: companyId }] = await tx.insert(s.companies).values(fields).returning({ id: s.companies.id });
    }

    await tx.delete(s.companyItems).where(eq(s.companyItems.companyId, companyId));
    await tx.insert(s.companyItems).values(items.map((i, sort) => ({ ...i, sort, companyId })));

    const keepSlotIds = input.slots.flatMap((sl) => (sl.id ? [sl.id] : []));
    await tx
      .delete(s.slots)
      .where(and(eq(s.slots.companyId, companyId), keepSlotIds.length ? notInArray(s.slots.id, keepSlotIds) : undefined));

    for (const sl of input.slots) {
      let slotId = sl.id;
      if (slotId) {
        const [row] = await tx
          .update(s.slots)
          .set({ startsAt: sl.startsAt, endsAt: sl.endsAt })
          .where(and(eq(s.slots.id, slotId), eq(s.slots.companyId, companyId)))
          .returning();
        if (!row) slotId = undefined;
      }
      if (!slotId) {
        [{ id: slotId }] = await tx.insert(s.slots).values({ companyId, startsAt: sl.startsAt, endsAt: sl.endsAt }).returning({ id: s.slots.id });
      }
      const current = await tx.select().from(s.assignments).where(eq(s.assignments.slotId, slotId));
      const gone = current.filter((a) => !sl.roomIds.includes(a.roomId)).map((a) => a.id);
      if (gone.length) await tx.delete(s.assignments).where(inArray(s.assignments.id, gone));
      const have = new Set(current.map((a) => a.roomId));
      for (const roomId of sl.roomIds) {
        if (!have.has(roomId)) await tx.insert(s.assignments).values({ slotId, roomId });
      }
      const standard = await tx
        .select({ id: s.assignments.id })
        .from(s.assignments)
        .where(and(eq(s.assignments.slotId, slotId), eq(s.assignments.customized, false)));
      for (const a of standard) await syncTasks(tx, a.id, items);
    }

    const when = input.slots.map((sl) => fmtRange(sl.startsAt, sl.endsAt)).join("; ");
    await log(tx, actor, input.id ? "company.updated" : "company.created", `${input.id ? "Updated" : "Scheduled"} ${input.name} (${when})`, { companyId });
    return companyId;
  });
  return { ok: true, id };
}

export async function deleteCompany(actor: Actor, id: number) {
  const db = await getDb();
  const [row] = await db.delete(s.companies).where(eq(s.companies.id, id)).returning();
  if (!row) throw new UserError("That company no longer exists.");
  await log(db, actor, "company.deleted", `Deleted ${row.name}`);
}

/** End every running or upcoming slot now, moving the company to Past. */
export async function finishCompany(actor: Actor, id: number) {
  const db = await getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(s.slots).set({ endsAt: now }).where(and(eq(s.slots.companyId, id), gt(s.slots.endsAt, now), lt(s.slots.startsAt, now)));
    await tx.delete(s.slots).where(and(eq(s.slots.companyId, id), gt(s.slots.startsAt, now)));
    const [c] = await tx.select().from(s.companies).where(eq(s.companies.id, id));
    await log(tx, actor, "company.finished", `Marked ${c?.name ?? "company"} as finished`, { companyId: id });
  });
}

/* ───────────────────────── Setup: members, rooms, presets, settings ───────────────────────── */

export const MemberInput = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  phone: z.string().trim().max(40).default(""),
  rollNumber: z
    .string()
    .trim()
    .min(1, "Roll number is required.")
    .max(40)
    .transform((r) => r.toUpperCase()),
  active: z.boolean().default(true),
});

function uniqueViolation(e: unknown) {
  const msg = String((e as { message?: string; cause?: { message?: string } })?.cause?.message ?? (e as Error)?.message ?? "");
  return /unique|duplicate/i.test(msg);
}

export async function createMember(actor: Actor, raw: unknown) {
  const input = MemberInput.parse(raw);
  const db = await getDb();
  try {
    const [m] = await db.insert(s.members).values(input).returning();
    await log(db, actor, "member.created", `Added member ${m.name}`);
    return m;
  } catch (e) {
    if (uniqueViolation(e)) throw new UserError(`Roll number ${input.rollNumber} is already used by another member.`);
    throw e;
  }
}

export async function updateMember(actor: Actor, id: number, raw: unknown) {
  const input = MemberInput.partial().parse(raw);
  const db = await getDb();
  try {
    const [m] = await db.update(s.members).set(input).where(eq(s.members.id, id)).returning();
    if (!m) throw new UserError("Member not found.");
    await log(db, actor, "member.updated", `Updated member ${m.name}`);
    return m;
  } catch (e) {
    if (uniqueViolation(e)) throw new UserError(`Roll number ${input.rollNumber} is already used by another member.`);
    throw e;
  }
}

export async function deleteMember(actor: Actor, id: number) {
  const db = await getDb();
  const [m] = await db.delete(s.members).where(eq(s.members.id, id)).returning();
  if (!m) throw new UserError("Member not found.");
  await log(db, actor, "member.deleted", `Removed member ${m.name}`);
}

export const BuildingInput = z.object({ name: z.string().trim().min(1, "Building name is required.").max(60), sort: z.number().int().default(0) });

export async function createBuilding(actor: Actor, raw: unknown) {
  const input = BuildingInput.parse(raw);
  const db = await getDb();
  try {
    const [b] = await db.insert(s.buildings).values(input).returning();
    await log(db, actor, "building.created", `Added building ${b.name}`);
    return b;
  } catch (e) {
    if (uniqueViolation(e)) throw new UserError(`A building called ${input.name} already exists.`);
    throw e;
  }
}

export async function updateBuilding(actor: Actor, id: number, raw: unknown) {
  const input = BuildingInput.partial().parse(raw);
  const db = await getDb();
  const [b] = await db.update(s.buildings).set(input).where(eq(s.buildings.id, id)).returning();
  if (!b) throw new UserError("Building not found.");
  await log(db, actor, "building.updated", `Updated building ${b.name}`);
  return b;
}

export async function deleteBuilding(actor: Actor, id: number) {
  const db = await getDb();
  try {
    const [b] = await db.delete(s.buildings).where(eq(s.buildings.id, id)).returning();
    if (!b) throw new UserError("Building not found.");
    await log(db, actor, "building.deleted", `Deleted building ${b.name}`);
  } catch (e) {
    if (e instanceof UserError) throw e;
    throw new UserError("This building has rooms on the schedule. Remove them from companies first, or deactivate the rooms instead.");
  }
}

export const RoomsInput = z.object({
  buildingId: z.number().int(),
  floor: z.string().trim().max(40).default(""),
  /** Accepts "11, 12, 13" or ranges like "11-17". */
  numbers: z.string().trim().min(1, "Enter at least one room number."),
});

export function parseRoomNumbers(text: string) {
  const out: string[] = [];
  for (const part of text.split(/[\s,]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m && Number(m[2]) >= Number(m[1]) && Number(m[2]) - Number(m[1]) < 200) {
      for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push(String(n));
    } else out.push(part);
  }
  return [...new Set(out)];
}

export async function createRooms(actor: Actor, raw: unknown) {
  const input = RoomsInput.parse(raw);
  const numbers = parseRoomNumbers(input.numbers);
  const db = await getDb();
  const rows = await db
    .insert(s.rooms)
    .values(numbers.map((number) => ({ buildingId: input.buildingId, floor: input.floor, number, sort: Number(number) || 0 })))
    .onConflictDoNothing()
    .returning();
  if (rows.length) await log(db, actor, "room.created", `Added room${rows.length > 1 ? "s" : ""} ${rows.map((r) => r.number).join(", ")}`);
  const made = new Set(rows.map((r) => r.number));
  return { created: rows, skipped: numbers.filter((n) => !made.has(n)) };
}

export const RoomInput = z.object({
  number: z.string().trim().min(1, "Room number is required.").max(20),
  buildingId: z.number().int(),
  floor: z.string().trim().max(40),
  active: z.boolean(),
  sort: z.number().int(),
});

/** Edit a room, including moving it to another building or floor. */
export async function updateRoom(actor: Actor, id: number, raw: unknown) {
  const input = RoomInput.partial().parse(raw);
  const db = await getDb();
  try {
    const [r] = await db
      .update(s.rooms)
      .set({ ...input, ...(input.number && input.sort === undefined ? { sort: Number(input.number) || 0 } : {}) })
      .where(eq(s.rooms.id, id))
      .returning();
    if (!r) throw new UserError("Room not found.");
    const [b] = await db.select().from(s.buildings).where(eq(s.buildings.id, r.buildingId));
    await log(db, actor, "room.updated", `Updated room ${r.number} (${b?.name ?? "?"}${r.floor ? `, ${r.floor}` : ""})`);
    return r;
  } catch (e) {
    if (uniqueViolation(e)) throw new UserError("A room with that number already exists in that building.");
    throw e;
  }
}

export const FloorRenameInput = z.object({
  buildingId: z.number().int(),
  from: z.string().trim(),
  to: z.string().trim().min(1, "Floor name is required.").max(40),
});

/** Rename a floor: every room on it in that building moves to the new name. */
export async function renameFloor(actor: Actor, raw: unknown) {
  const { buildingId, from, to } = FloorRenameInput.parse(raw);
  const db = await getDb();
  const rows = await db
    .update(s.rooms)
    .set({ floor: to })
    .where(and(eq(s.rooms.buildingId, buildingId), eq(s.rooms.floor, from)))
    .returning({ id: s.rooms.id });
  if (!rows.length) throw new UserError(`No rooms found on ${from || "that floor"}.`);
  const [b] = await db.select().from(s.buildings).where(eq(s.buildings.id, buildingId));
  await log(db, actor, "floor.renamed", `Renamed ${b?.name ?? ""} ${from || "(no floor)"} to ${to}`);
  return { renamed: rows.length };
}

export async function deleteRoom(actor: Actor, id: number) {
  const db = await getDb();
  try {
    const [r] = await db.delete(s.rooms).where(eq(s.rooms.id, id)).returning();
    if (!r) throw new UserError("Room not found.");
    await log(db, actor, "room.deleted", `Deleted room ${r.number}`);
  } catch (e) {
    if (e instanceof UserError) throw e;
    throw new UserError("This room is on a company's schedule, so it can't be deleted. Mark it inactive to hide it from new schedules.");
  }
}

export const PresetInput = z.object({
  label: z.string().trim().min(1, "Item name is required.").max(80),
  group: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((g) => g || null),
  defaultQty: z.number().int().positive().max(999).nullish().transform((q) => q ?? null),
  modes: z.array(z.enum(["offline", "online", "hybrid"])).default([]),
  sort: z.number().int().default(0),
  active: z.boolean().default(true),
});

export async function createPreset(actor: Actor, raw: unknown) {
  const input = PresetInput.parse(raw);
  const db = await getDb();
  const [p] = await db.insert(s.presets).values(input).returning();
  await log(db, actor, "preset.created", `Added checklist item ${p.label}${p.group ? ` to ${p.group}` : ""}`);
  return p;
}

export async function updatePreset(actor: Actor, id: number, raw: unknown) {
  const input = PresetInput.partial().parse(raw);
  const db = await getDb();
  const [p] = await db.update(s.presets).set(input).where(eq(s.presets.id, id)).returning();
  if (!p) throw new UserError("Checklist item not found.");
  await log(db, actor, "preset.updated", `Updated checklist item ${p.label}`);
  return p;
}

export async function deletePreset(actor: Actor, id: number) {
  const db = await getDb();
  const [p] = await db.delete(s.presets).where(eq(s.presets.id, id)).returning();
  if (!p) throw new UserError("Checklist item not found.");
  await log(db, actor, "preset.deleted", `Deleted checklist item ${p.label}`);
}

export async function setLateMinutes(actor: Actor, minutes: number) {
  const n = z.number().int().min(0).max(24 * 60).parse(minutes);
  const db = await getDb();
  await db
    .insert(s.settings)
    .values({ key: "late_threshold_minutes", value: n })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: n } });
  await log(db, actor, "settings.updated", `Rooms now turn red ${n} min before start`);
}
