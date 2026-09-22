import "server-only";
import ExcelJS from "exceljs";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { dayKey, fmtRange, fromIst, hm } from "@/lib/time";
import { getPresets } from "./admin-data";
import { UserError, type Actor } from "./types";
import type { ProcessMode } from "@/db/schema";

/** Spreadsheet columns, matched loosely so "Room #", "room number" and "Room#" all land. */
const COLUMNS = {
  company: ["company", "companyname", "organisation", "organization"],
  panel: ["paneldetails", "panel", "details", "panelname"],
  start: ["starttime", "start", "from", "fromtime"],
  end: ["endtime", "end", "to", "totime"],
  building: ["building", "block"],
  floor: ["floor", "group"],
  room: ["room", "roomno", "roomnumber", "rooms"],
  items: ["setuprequirements", "setuprequirementsoptional", "requirements", "setup"],
  date: ["date", "day"],
  spocName: ["spocname", "spoc"],
  spocPhone: ["spocphone", "phone", "spoccontact", "contact"],
  mode: ["mode", "process", "processmode"],
} as const;

type Field = keyof typeof COLUMNS;
const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");

export type ImportRow = {
  row: number;
  company: string;
  panel: string;
  building: string;
  floor: string;
  room: string;
  items: string;
  startsAt: Date | null;
  endsAt: Date | null;
  spocName: string;
  spocPhone: string;
  mode: ProcessMode | null;
  problem?: string;
  roomId?: number;
};

export type PlannedRoom = { roomId: number; label: string; panel: string; extras: { label: string; qty: number | null }[]; clash?: string };
export type PlannedSlot = { startsAt: Date; endsAt: Date; when: string; rooms: PlannedRoom[] };
export type PlannedCompany = {
  name: string;
  existingId: number | null;
  spocName: string;
  spocPhone: string;
  mode: ProcessMode;
  slots: PlannedSlot[];
};
export type ImportPlan = {
  companies: PlannedCompany[];
  problems: { row: number; message: string }[];
  counts: { rows: number; companies: number; slots: number; rooms: number };
};

/** Excel dates arrive as Date; plain times as Date on 1899-12-30, or as text like "9:30 am". */
function readTime(value: unknown, fallbackDate: string): Date | null {
  if (value instanceof Date) {
    const iso = value.toISOString();
    // A time-only cell: keep the clock, take the date from elsewhere.
    if (iso.startsWith("1899-") || iso.startsWith("1900-")) return fromIst(fallbackDate, iso.slice(11, 16));
    return value;
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  const m = text.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
  if (m) {
    let h = Number(m[1]);
    const suffix = m[3]?.toLowerCase();
    if (suffix === "pm" && h < 12) h += 12;
    if (suffix === "am" && h === 12) h = 0;
    return fromIst(fallbackDate, `${String(h).padStart(2, "0")}:${m[2]}`);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readDate(value: unknown): string | null {
  if (value instanceof Date) return dayKey(value);
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : dayKey(parsed);
}

/** "Projector, 6 chairs, Mic x2" → [{Projector}, {Chairs, 6}, {Mic, 2}] */
export function parseItems(text: string) {
  return String(text ?? "")
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      let label = part;
      let qty: number | null = null;
      const trailing = part.match(/^(.*?)[\s-]*(?:x|×|\*)\s*(\d+)$/i);
      const leading = part.match(/^(\d+)\s*[x×*]?\s+(.*)$/);
      if (trailing) {
        label = trailing[1].trim();
        qty = Number(trailing[2]);
      } else if (leading) {
        qty = Number(leading[1]);
        label = leading[2].trim();
      }
      return { label: label.replace(/\s+/g, " ").trim(), qty };
    })
    .filter((i) => i.label);
}

/** Read the sheet into rows, using the header names to find each column. */
export async function readSheet(buffer: ArrayBuffer, fallbackDate: string): Promise<ImportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new UserError("That file has no sheets in it.");

  let headerRow = 0;
  const column: Partial<Record<Field, number>> = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 10); r++) {
    const found: Partial<Record<Field, number>> = {};
    ws.getRow(r).eachCell((cell, c) => {
      const key = norm(cell.value);
      for (const [field, names] of Object.entries(COLUMNS) as [Field, readonly string[]][]) {
        if (!found[field] && names.some((n) => key === n || key.startsWith(n))) found[field] = c;
      }
    });
    if (found.company && found.room) {
      headerRow = r;
      Object.assign(column, found);
      break;
    }
  }
  if (!headerRow) throw new UserError("Couldn't find the header row. It needs at least a Company column and a Room# column.");

  const cell = (r: ExcelJS.Row, field: Field) => {
    const c = column[field];
    if (!c) return "";
    const v = r.getCell(c).value;
    if (v && typeof v === "object" && "text" in v) return String((v as { text: string }).text).trim();
    if (v && typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "").trim();
    return v instanceof Date ? v : String(v ?? "").trim();
  };

  const rows: ImportRow[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const company = String(cell(row, "company") ?? "").trim();
    const room = String(cell(row, "room") ?? "").trim();
    if (!company && !room) continue;
    const date = readDate(column.date ? row.getCell(column.date).value : null) ?? fallbackDate;
    const modeText = norm(cell(row, "mode"));
    rows.push({
      row: r,
      company,
      panel: String(cell(row, "panel") ?? "").trim(),
      building: String(cell(row, "building") ?? "").trim(),
      floor: String(cell(row, "floor") ?? "").trim(),
      room: room.replace(/\.0$/, ""),
      items: String(cell(row, "items") ?? "").trim(),
      startsAt: readTime(column.start ? row.getCell(column.start).value : null, date),
      endsAt: readTime(column.end ? row.getCell(column.end).value : null, date),
      spocName: String(cell(row, "spocName") ?? "").trim(),
      spocPhone: String(cell(row, "spocPhone") ?? "").trim(),
      mode: modeText.startsWith("hyb") ? "hybrid" : modeText.startsWith("on") ? "online" : modeText.startsWith("off") || modeText.startsWith("inper") ? "offline" : null,
    });
  }
  if (!rows.length) throw new UserError("The sheet has headers but no rows under them.");
  return rows;
}

/** Turn rows into companies and slots, matching rooms and flagging anything odd. */
export async function planImport(rows: ImportRow[], defaultMode: ProcessMode): Promise<ImportPlan> {
  const db = await getDb();
  const rooms = await db
    .select({ id: s.rooms.id, number: s.rooms.number, floor: s.rooms.floor, building: s.buildings.name, active: s.rooms.active })
    .from(s.rooms)
    .innerJoin(s.buildings, eq(s.buildings.id, s.rooms.buildingId));
  const companies = await db.select({ id: s.companies.id, name: s.companies.name }).from(s.companies);
  const problems: ImportPlan["problems"] = [];

  const matchRoom = (r: ImportRow) => {
    const number = r.room.toLowerCase();
    let hits = rooms.filter((x) => x.number.toLowerCase() === number);
    if (r.building) {
      const byBuilding = hits.filter((x) => x.building.toLowerCase() === r.building.toLowerCase());
      if (byBuilding.length) hits = byBuilding;
      else if (hits.length && !hits.some((x) => x.building.toLowerCase() === r.building.toLowerCase())) {
        problems.push({ row: r.row, message: `Room ${r.room} isn't in ${r.building}; using ${hits[0].building} ${hits[0].number}.` });
      }
    }
    return hits[0] ?? null;
  };

  const grouped = new Map<string, PlannedCompany>();
  for (const r of rows) {
    if (!r.company) {
      problems.push({ row: r.row, message: "No company name, so this row was skipped." });
      continue;
    }
    if (!r.startsAt || !r.endsAt) {
      problems.push({ row: r.row, message: "Start or end time is missing or unreadable, so this row was skipped." });
      continue;
    }
    if (r.endsAt <= r.startsAt) {
      problems.push({ row: r.row, message: "The end time isn't after the start time, so this row was skipped." });
      continue;
    }
    const room = matchRoom(r);
    if (!room) {
      problems.push({ row: r.row, message: `No room called ${r.room}${r.building ? ` in ${r.building}` : ""} exists yet. Add it in Setup, then import again.` });
      continue;
    }
    if (!room.active) problems.push({ row: r.row, message: `${room.building} ${room.number} is marked inactive, but it will still be scheduled.` });

    const key = r.company.trim().toLowerCase();
    let company = grouped.get(key);
    if (!company) {
      const existing = companies.find((c) => c.name.trim().toLowerCase() === key);
      company = {
        name: r.company.trim(),
        existingId: existing?.id ?? null,
        spocName: r.spocName,
        spocPhone: r.spocPhone,
        mode: r.mode ?? defaultMode,
        slots: [],
      };
      grouped.set(key, company);
    }
    company.spocName ||= r.spocName;
    company.spocPhone ||= r.spocPhone;
    if (r.mode) company.mode = r.mode;

    const when = `${r.startsAt.getTime()}-${r.endsAt.getTime()}`;
    let slot = company.slots.find((x) => `${x.startsAt.getTime()}-${x.endsAt.getTime()}` === when);
    if (!slot) {
      slot = { startsAt: r.startsAt, endsAt: r.endsAt, when: fmtRange(r.startsAt, r.endsAt), rooms: [] };
      company.slots.push(slot);
    }
    if (slot.rooms.some((x) => x.roomId === room.id)) {
      problems.push({ row: r.row, message: `${room.building} ${room.number} is listed twice for ${company.name} at the same time; the duplicate was ignored.` });
      continue;
    }
    slot.rooms.push({ roomId: room.id, label: `${room.building} ${room.number}`, panel: r.panel, extras: parseItems(r.items) });
  }

  const plan: ImportPlan = {
    companies: [...grouped.values()].sort((a, b) => (a.slots[0]?.startsAt.getTime() ?? 0) - (b.slots[0]?.startsAt.getTime() ?? 0)),
    problems,
    counts: { rows: rows.length, companies: grouped.size, slots: 0, rooms: 0 },
  };
  for (const c of plan.companies) {
    c.slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    plan.counts.slots += c.slots.length;
    plan.counts.rooms += c.slots.reduce((n, sl) => n + sl.rooms.length, 0);
  }

  // Clashes with companies already on the schedule (other than ones we're replacing).
  const replacing = plan.companies.flatMap((c) => (c.existingId ? [c.existingId] : []));
  for (const c of plan.companies)
    for (const slot of c.slots) {
      const roomIds = slot.rooms.map((r) => r.roomId);
      if (!roomIds.length) continue;
      const clashes = await db
        .select({ roomId: s.assignments.roomId, company: s.companies.name, startsAt: s.slots.startsAt, endsAt: s.slots.endsAt })
        .from(s.assignments)
        .innerJoin(s.slots, eq(s.slots.id, s.assignments.slotId))
        .innerJoin(s.companies, eq(s.companies.id, s.slots.companyId))
        .where(and(inArray(s.assignments.roomId, roomIds), lt(s.slots.startsAt, slot.endsAt), gt(s.slots.endsAt, slot.startsAt)));
      for (const clash of clashes) {
        if (replacing.includes(companies.find((x) => x.name === clash.company)?.id ?? -1)) continue;
        const room = slot.rooms.find((r) => r.roomId === clash.roomId);
        if (room) room.clash = `${clash.company}, ${fmtRange(clash.startsAt, clash.endsAt)}`;
      }
    }
  return plan;
}

/** Create everything in the plan. Existing companies of the same name gain the new slots. */
export async function applyImport(actor: Actor, plan: ImportPlan) {
  const db = await getDb();
  const presets = await getPresets();
  const created = { companies: 0, updated: 0, slots: 0, rooms: 0 };

  await db.transaction(async (tx) => {
    for (const c of plan.companies) {
      let companyId: number;
      const defaults = presets
        .filter((p) => p.active && p.modes.includes(c.mode))
        .map((p, sort) => ({ label: p.label, group: p.group, qty: p.defaultQty, note: "", sort }));

      if (c.existingId) {
        companyId = c.existingId;
        await tx
          .update(s.companies)
          .set({ spocName: c.spocName || undefined, spocPhone: c.spocPhone || undefined, updatedAt: new Date() })
          .where(eq(s.companies.id, companyId));
        created.updated++;
      } else {
        const [row] = await tx
          .insert(s.companies)
          .values({ name: c.name, spocName: c.spocName, spocPhone: c.spocPhone, mode: c.mode })
          .returning({ id: s.companies.id });
        companyId = row.id;
        await tx.insert(s.companyItems).values(defaults.map((i) => ({ ...i, companyId })));
        created.companies++;
      }

      const items = (await tx.select().from(s.companyItems).where(eq(s.companyItems.companyId, companyId))).sort((a, b) => a.sort - b.sort);
      const base = items.length ? items.map(({ label, group, qty, note, sort }) => ({ label, group, qty, note, sort })) : defaults;

      for (const slot of c.slots) {
        const [slotRow] = await tx.insert(s.slots).values({ companyId, startsAt: slot.startsAt, endsAt: slot.endsAt }).returning({ id: s.slots.id });
        created.slots++;
        for (const room of slot.rooms) {
          const [assignment] = await tx
            .insert(s.assignments)
            .values({ slotId: slotRow.id, roomId: room.roomId, note: room.panel, customized: room.extras.length > 0 })
            .returning({ id: s.assignments.id });
          created.rooms++;
          const extras = room.extras
            .filter((e) => !base.some((b) => b.label.toLowerCase() === e.label.toLowerCase()))
            .map((e, i) => ({ label: e.label, group: null, qty: e.qty, note: "", sort: base.length + i }));
          // A quantity given in the sheet wins over the company default.
          const merged = base.map((b) => {
            const override = room.extras.find((e) => e.label.toLowerCase() === b.label.toLowerCase() && e.qty);
            return override ? { ...b, qty: override.qty } : b;
          });
          await tx.insert(s.tasks).values([...merged, ...extras].map((i) => ({ ...i, assignmentId: assignment.id })));
        }
      }

      await tx.insert(s.activity).values({
        actorName: actor.name,
        memberId: actor.kind === "member" ? actor.id : null,
        action: "company.imported",
        summary: `Imported ${c.name} from a sheet: ${c.slots.length} slot${c.slots.length === 1 ? "" : "s"}, ${c.slots.reduce((n, sl) => n + sl.rooms.length, 0)} rooms`,
        companyId,
      });
    }
  });
  return created;
}

/** The blank sheet, with the headers this importer expects. */
export async function templateWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Room allocation");
  ws.columns = [
    { header: "Company", key: "company", width: 26 },
    { header: "Panel Details", key: "panel", width: 22 },
    { header: "Date", key: "date", width: 14 },
    { header: "Start Time", key: "start", width: 13 },
    { header: "End Time", key: "end", width: 13 },
    { header: "Building", key: "building", width: 12 },
    { header: "Floor", key: "floor", width: 12 },
    { header: "Room#", key: "room", width: 10 },
    { header: "Set-up Requirements (Optional)", key: "items", width: 38 },
    { header: "SPOC Name", key: "spocName", width: 20 },
    { header: "SPOC Phone", key: "spocPhone", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle" };
  const today = dayKey(new Date());
  const example = fromIst(today, "09:30");
  ws.addRow({
    company: "Northwind Analytics",
    panel: "Panel 1, technical",
    date: today,
    start: hm(example),
    end: "13:00",
    building: "LC2",
    floor: "Floor 1",
    room: "11",
    items: "Projector, Chairs x6, Extension board",
    spocName: "",
    spocPhone: "",
  });
  ws.addRow({ company: "Northwind Analytics", panel: "Panel 2, HR", date: today, start: hm(example), end: "13:00", building: "LC2", floor: "Floor 1", room: "12" });
  return wb;
}
