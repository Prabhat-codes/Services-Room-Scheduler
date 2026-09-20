import "server-only";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema as s, type DB } from "@/db";
import type { ProcessMode } from "@/db/schema";
import { dayKey } from "@/lib/time";
import type { CompanyStatus, RoomStatus } from "./types";

export const DEFAULT_LATE_MINUTES = 30;

export async function getLateMinutes(db?: DB) {
  db ??= await getDb();
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, "late_threshold_minutes"));
  const n = Number(row?.value);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LATE_MINUTES;
}

export type BoardRoom = {
  id: number;
  slotId: number;
  roomId: number;
  number: string;
  floor: string;
  buildingId: number;
  building: string;
  total: number;
  ticked: number;
  doneAt: Date | null;
  doneBy: string | null;
  customized: boolean;
  openComments: number;
  status: RoomStatus;
};

export type BoardSlot = { id: number; startsAt: Date; endsAt: Date; over: boolean; rooms: BoardRoom[] };

export type BoardCompany = {
  id: number;
  name: string;
  spocName: string;
  spocPhone: string;
  mode: ProcessMode;
  notes: string;
  slots: BoardSlot[];
  past: boolean;
  /** Rooms that matter right now: every unfinished slot on the earliest upcoming day. */
  focus: BoardRoom[];
  focusDay: string | null;
  nextStart: Date | null;
  lastEnd: Date | null;
  status: CompanyStatus;
  openComments: number;
};

export function roomStatus(
  r: { ticked: number; doneAt: Date | null },
  slot: { startsAt: Date; endsAt: Date },
  now: Date,
  lateMinutes: number,
): RoomStatus {
  if (slot.endsAt <= now) return "over";
  if (r.doneAt) return "ready";
  if (now.getTime() >= slot.startsAt.getTime() - lateMinutes * 60000) return "late";
  return r.ticked > 0 ? "working" : "idle";
}

export function companyStatus(focus: BoardRoom[], past: boolean): CompanyStatus {
  if (past) return "over";
  if (focus.length === 0) return "idle";
  if (focus.some((r) => r.status === "late")) return "late";
  if (focus.every((r) => r.status === "ready")) return "ready";
  if (focus.some((r) => r.status === "ready" || r.status === "working")) return "working";
  return "idle";
}

/** Everything the dashboards need, in a handful of queries (the dataset is small). */
export async function getBoard(opts: { companyId?: number; now?: Date } = {}): Promise<BoardCompany[]> {
  const db = await getDb();
  const now = opts.now ?? new Date();
  const lateMinutes = await getLateMinutes(db);
  const byCompany = opts.companyId ? eq(s.companies.id, opts.companyId) : undefined;

  // One query at a time: the pooler gives each instance a single connection.
  const companies = await db.select().from(s.companies).where(byCompany);
  const slots = await db
      .select()
      .from(s.slots)
      .where(opts.companyId ? eq(s.slots.companyId, opts.companyId) : undefined)
      .orderBy(asc(s.slots.startsAt));
  const rooms = await db
      .select({
        id: s.assignments.id,
        slotId: s.assignments.slotId,
        roomId: s.rooms.id,
        number: s.rooms.number,
        floor: s.rooms.floor,
        roomSort: s.rooms.sort,
        buildingId: s.buildings.id,
        building: s.buildings.name,
        buildingSort: s.buildings.sort,
        doneAt: s.assignments.doneAt,
        doneBy: s.members.name,
        customized: s.assignments.customized,
      })
      .from(s.assignments)
      .innerJoin(s.rooms, eq(s.rooms.id, s.assignments.roomId))
      .innerJoin(s.buildings, eq(s.buildings.id, s.rooms.buildingId))
      .leftJoin(s.members, eq(s.members.id, s.assignments.doneById))
      .orderBy(asc(s.buildings.sort), asc(s.buildings.name), asc(s.rooms.floor), asc(s.rooms.sort), asc(s.rooms.number));
  const taskCounts = await db
      .select({
        assignmentId: s.tasks.assignmentId,
        total: count(),
        ticked: sql<number>`count(${s.tasks.doneAt})`.mapWith(Number),
      })
      .from(s.tasks)
      .groupBy(s.tasks.assignmentId);
  const commentCounts = await db
    .select({ assignmentId: s.comments.assignmentId, n: count() })
    .from(s.comments)
    .where(isNull(s.comments.resolvedAt))
    .groupBy(s.comments.assignmentId);

  const tc = new Map(taskCounts.map((t) => [t.assignmentId, t]));
  const cc = new Map(commentCounts.map((c) => [c.assignmentId, c.n]));
  const slotById = new Map(slots.map((sl) => [sl.id, sl]));

  const roomsBySlot = new Map<number, BoardRoom[]>();
  for (const r of rooms) {
    const slot = slotById.get(r.slotId);
    if (!slot) continue;
    const counts = tc.get(r.id);
    const base = {
      id: r.id,
      slotId: r.slotId,
      roomId: r.roomId,
      number: r.number,
      floor: r.floor,
      buildingId: r.buildingId,
      building: r.building,
      total: counts?.total ?? 0,
      ticked: counts?.ticked ?? 0,
      doneAt: r.doneAt,
      doneBy: r.doneBy,
      customized: r.customized,
      openComments: cc.get(r.id) ?? 0,
    };
    const list = roomsBySlot.get(r.slotId) ?? [];
    list.push({ ...base, status: roomStatus(base, slot, now, lateMinutes) });
    roomsBySlot.set(r.slotId, list);
  }

  const slotsByCompany = new Map<number, BoardSlot[]>();
  for (const sl of slots) {
    const list = slotsByCompany.get(sl.companyId) ?? [];
    list.push({ id: sl.id, startsAt: sl.startsAt, endsAt: sl.endsAt, over: sl.endsAt <= now, rooms: roomsBySlot.get(sl.id) ?? [] });
    slotsByCompany.set(sl.companyId, list);
  }

  return companies
    .map((c) => {
      const cs = slotsByCompany.get(c.id) ?? [];
      const live = cs.filter((sl) => !sl.over);
      const past = cs.length > 0 && live.length === 0;
      const focusDay = live[0] ? dayKey(live[0].startsAt) : null;
      const focus = live.filter((sl) => dayKey(sl.startsAt) === focusDay).flatMap((sl) => sl.rooms);
      return {
        id: c.id,
        name: c.name,
        spocName: c.spocName,
        spocPhone: c.spocPhone,
        mode: c.mode,
        notes: c.notes,
        slots: cs,
        past,
        focus,
        focusDay,
        nextStart: live[0]?.startsAt ?? null,
        lastEnd: cs.at(-1)?.endsAt ?? null,
        status: companyStatus(focus, past),
        openComments: cs.flatMap((sl) => sl.rooms).reduce((n, r) => n + r.openComments, 0),
      };
    })
    .sort((a, b) => {
      if (a.past !== b.past) return a.past ? 1 : -1;
      if (a.past) return (b.lastEnd?.getTime() ?? 0) - (a.lastEnd?.getTime() ?? 0);
      return (a.nextStart?.getTime() ?? Infinity) - (b.nextStart?.getTime() ?? Infinity);
    });
}

/** Full checklist for one room-in-slot, with company + slot context. */
export async function getAssignment(assignmentId: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      id: s.assignments.id,
      doneAt: s.assignments.doneAt,
      doneBy: s.members.name,
      customized: s.assignments.customized,
      roomId: s.rooms.id,
      number: s.rooms.number,
      floor: s.rooms.floor,
      building: s.buildings.name,
      slotId: s.slots.id,
      startsAt: s.slots.startsAt,
      endsAt: s.slots.endsAt,
      companyId: s.companies.id,
      companyName: s.companies.name,
      spocName: s.companies.spocName,
      spocPhone: s.companies.spocPhone,
      mode: s.companies.mode,
      notes: s.companies.notes,
    })
    .from(s.assignments)
    .innerJoin(s.rooms, eq(s.rooms.id, s.assignments.roomId))
    .innerJoin(s.buildings, eq(s.buildings.id, s.rooms.buildingId))
    .innerJoin(s.slots, eq(s.slots.id, s.assignments.slotId))
    .innerJoin(s.companies, eq(s.companies.id, s.slots.companyId))
    .leftJoin(s.members, eq(s.members.id, s.assignments.doneById))
    .where(eq(s.assignments.id, assignmentId));
  if (!row) return null;

  const taskRows = await db
      .select({
        id: s.tasks.id,
        label: s.tasks.label,
        group: s.tasks.group,
        qty: s.tasks.qty,
        note: s.tasks.note,
        doneAt: s.tasks.doneAt,
        doneBy: s.members.name,
      })
      .from(s.tasks)
      .leftJoin(s.members, eq(s.members.id, s.tasks.doneById))
      .where(eq(s.tasks.assignmentId, assignmentId))
      .orderBy(asc(s.tasks.sort), asc(s.tasks.id));
  const commentRows = await db.select().from(s.comments).where(eq(s.comments.assignmentId, assignmentId)).orderBy(asc(s.comments.createdAt));
  const lateMinutes = await getLateMinutes(db);
  const ticked = taskRows.filter((t) => t.doneAt).length;
  const status = roomStatus({ ticked, doneAt: row.doneAt }, row, new Date(), lateMinutes);
  return { ...row, tasks: taskRows, comments: commentRows, status, lateMinutes };
}

export async function getOpenCommentCount() {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(s.comments).where(and(isNull(s.comments.resolvedAt)));
  return row?.n ?? 0;
}
