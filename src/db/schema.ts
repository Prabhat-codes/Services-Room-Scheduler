import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const processMode = pgEnum("process_mode", ["offline", "online", "hybrid"]);
export type ProcessMode = (typeof processMode.enumValues)[number];

const ts = (name: string) => timestamp(name, { withTimezone: true });

/** Key/value app settings, e.g. late_threshold_minutes. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sort: integer("sort").notNull().default(0),
});

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "cascade" }),
    floor: text("floor").notNull().default(""),
    number: text("number").notNull(),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("rooms_building_number").on(t.buildingId, t.number)],
);

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rollNumber: text("roll_number").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Checklist tiles the admin picks from. `group` bundles items (e.g. "Recruiter's tray"). */
export const presets = pgTable("presets", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  group: text("group"),
  defaultQty: integer("default_qty"),
  /** Process modes for which this item is pre-selected automatically. */
  modes: text("modes").array().notNull().default([]),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  spocName: text("spoc_name").notNull().default(""),
  spocPhone: text("spoc_phone").notNull().default(""),
  mode: processMode("mode").notNull().default("offline"),
  notes: text("notes").notNull().default(""),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** The company-wide checklist, copied into every room that isn't customised. */
export const companyItems = pgTable(
  "company_items",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    group: text("group"),
    qty: integer("qty"),
    note: text("note").notNull().default(""),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("company_items_company").on(t.companyId)],
);

/** A time window during which a company occupies a set of rooms. */
export const slots = pgTable(
  "slots",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
  },
  (t) => [index("slots_company").on(t.companyId), index("slots_time").on(t.startsAt, t.endsAt)],
);

/** One room within one slot — the unit a runner prepares and marks "All done". */
export const assignments = pgTable(
  "assignments",
  {
    id: serial("id").primaryKey(),
    slotId: integer("slot_id")
      .notNull()
      .references(() => slots.id, { onDelete: "cascade" }),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    customized: boolean("customized").notNull().default(false),
    doneAt: ts("done_at"),
    doneById: integer("done_by_id").references(() => members.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("assignments_slot_room").on(t.slotId, t.roomId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    group: text("group"),
    qty: integer("qty"),
    note: text("note").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    doneAt: ts("done_at"),
    doneById: integer("done_by_id").references(() => members.id, { onDelete: "set null" }),
  },
  (t) => [index("tasks_assignment").on(t.assignmentId)],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    resolvedAt: ts("resolved_at"),
  },
  (t) => [index("comments_assignment").on(t.assignmentId)],
);

/** Audit trail: who did what, when. */
export const activity = pgTable(
  "activity",
  {
    id: serial("id").primaryKey(),
    at: ts("at").notNull().defaultNow(),
    actorName: text("actor_name").notNull(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    companyId: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
    assignmentId: integer("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
  },
  (t) => [index("activity_at").on(t.at)],
);
