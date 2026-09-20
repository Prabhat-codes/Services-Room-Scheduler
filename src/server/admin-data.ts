import "server-only";
import { asc, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

export type BuildingWithRooms = {
  id: number;
  name: string;
  sort: number;
  rooms: { id: number; number: string; floor: string; active: boolean; sort: number }[];
};

export async function getBuildings(opts: { activeOnly?: boolean } = {}): Promise<BuildingWithRooms[]> {
  const db = await getDb();
  const buildings = await db.select().from(s.buildings).orderBy(asc(s.buildings.sort), asc(s.buildings.name));
  const rooms = await db
    .select()
    .from(s.rooms)
    .where(opts.activeOnly ? eq(s.rooms.active, true) : undefined)
    .orderBy(asc(s.rooms.floor), asc(s.rooms.sort), asc(s.rooms.number));
  return buildings.map((b) => ({
    ...b,
    rooms: rooms.filter((r) => r.buildingId === b.id).map(({ id, number, floor, active, sort }) => ({ id, number, floor, active, sort })),
  }));
}

export async function getPresets() {
  const db = await getDb();
  return db.select().from(s.presets).orderBy(asc(s.presets.sort), asc(s.presets.id));
}

export async function getMembers() {
  const db = await getDb();
  return db.select().from(s.members).orderBy(asc(s.members.name));
}

/** Members who can be a company SPOC, with their number for auto-fill. */
export async function getSpocOptions() {
  const db = await getDb();
  return db
    .select({ name: s.members.name, phone: s.members.phone })
    .from(s.members)
    .where(eq(s.members.active, true))
    .orderBy(asc(s.members.name));
}

/** Everything the edit form needs to round-trip a company. */
export async function getCompanyForEdit(id: number) {
  const db = await getDb();
  const [company] = await db.select().from(s.companies).where(eq(s.companies.id, id));
  if (!company) return null;
  const items = await db.select().from(s.companyItems).where(eq(s.companyItems.companyId, id)).orderBy(asc(s.companyItems.sort));
  const slots = await db.select().from(s.slots).where(eq(s.slots.companyId, id)).orderBy(asc(s.slots.startsAt));
  const assignments = await db
    .select({ slotId: s.assignments.slotId, roomId: s.assignments.roomId })
    .from(s.assignments)
    .innerJoin(s.slots, eq(s.slots.id, s.assignments.slotId))
    .where(eq(s.slots.companyId, id));
  return {
    ...company,
    items: items.map(({ label, group, qty, note }) => ({ label, group, qty, note })),
    slots: slots.map((sl) => ({
      id: sl.id,
      startsAt: sl.startsAt,
      endsAt: sl.endsAt,
      roomIds: assignments.filter((a) => a.slotId === sl.id).map((a) => a.roomId),
    })),
  };
}

/** Future and running bookings, so the scheduler can see clashes while picking rooms. */
export async function getBookings() {
  const db = await getDb();
  return db
    .select({
      roomId: s.assignments.roomId,
      companyId: s.companies.id,
      company: s.companies.name,
      startsAt: s.slots.startsAt,
      endsAt: s.slots.endsAt,
    })
    .from(s.assignments)
    .innerJoin(s.slots, eq(s.slots.id, s.assignments.slotId))
    .innerJoin(s.companies, eq(s.companies.id, s.slots.companyId))
    .where(gt(s.slots.endsAt, new Date(Date.now() - 864e5)));
}

export async function getComments(filter: "open" | "resolved" | "all") {
  const db = await getDb();
  return db
    .select({
      id: s.comments.id,
      body: s.comments.body,
      author: s.comments.authorName,
      createdAt: s.comments.createdAt,
      resolvedAt: s.comments.resolvedAt,
      assignmentId: s.assignments.id,
      room: s.rooms.number,
      building: s.buildings.name,
      companyId: s.companies.id,
      company: s.companies.name,
      startsAt: s.slots.startsAt,
    })
    .from(s.comments)
    .innerJoin(s.assignments, eq(s.assignments.id, s.comments.assignmentId))
    .innerJoin(s.rooms, eq(s.rooms.id, s.assignments.roomId))
    .innerJoin(s.buildings, eq(s.buildings.id, s.rooms.buildingId))
    .innerJoin(s.slots, eq(s.slots.id, s.assignments.slotId))
    .innerJoin(s.companies, eq(s.companies.id, s.slots.companyId))
    .where(filter === "open" ? isNull(s.comments.resolvedAt) : filter === "resolved" ? isNotNull(s.comments.resolvedAt) : undefined)
    .orderBy(desc(s.comments.createdAt));
}

export async function getActivity(limit = 300) {
  const db = await getDb();
  return db.select().from(s.activity).orderBy(desc(s.activity.at)).limit(limit);
}
