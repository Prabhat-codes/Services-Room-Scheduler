/**
 * Idempotent seed: buildings, rooms, members, checklist presets, settings.
 *   npm run db:seed            – reference data only (safe to re-run)
 *   npm run db:seed -- --demo  – also adds example companies around "now" (local testing)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { and, eq, isNull } from "drizzle-orm";
import { connect } from "../src/db/connect";
import * as s from "../src/db/schema";
import { BUILDINGS, MEMBERS, PRESETS, TRAY } from "../data/seed-data";

async function main() {
  const db = await connect();

  for (const [bi, b] of BUILDINGS.entries()) {
    await db.insert(s.buildings).values({ name: b.name, sort: bi }).onConflictDoNothing();
    const [building] = await db.select().from(s.buildings).where(eq(s.buildings.name, b.name));
    for (const f of b.floors)
      for (const number of f.rooms)
        await db.insert(s.rooms).values({ buildingId: building.id, floor: f.floor, number, sort: Number(number) }).onConflictDoNothing();
  }

  for (const [name, rollNumber] of MEMBERS) {
    await db.insert(s.members).values({ name, rollNumber }).onConflictDoUpdate({ target: s.members.rollNumber, set: { name } });
  }

  for (const [sort, p] of PRESETS.entries()) {
    const [found] = await db
      .select()
      .from(s.presets)
      .where(and(eq(s.presets.label, p.label), p.group ? eq(s.presets.group, p.group) : isNull(s.presets.group)));
    if (!found) await db.insert(s.presets).values({ ...p, sort });
  }

  await db.insert(s.settings).values({ key: "late_threshold_minutes", value: 30 }).onConflictDoNothing();

  console.log(`Seeded ${BUILDINGS.length} buildings, ${MEMBERS.length} members, ${PRESETS.length} checklist items.`);
  if (process.argv.includes("--demo")) await demo(db);
  process.exit(0);
}

async function demo(db: Awaited<ReturnType<typeof connect>>) {
  const rooms = await db.select({ id: s.rooms.id, number: s.rooms.number }).from(s.rooms);
  const room = (n: string) => rooms.find((r) => r.number === n)!.id;
  const presets = await db.select().from(s.presets);
  const [member] = await db.select().from(s.members).where(eq(s.members.rollNumber, "H25066"));
  const now = Date.now();
  const at = (mins: number) => new Date(Math.round((now + mins * 60000) / 300000) * 300000);

  const plans = [
    { name: "Northwind Analytics", spoc: "Riya Menon", phone: "+91 98200 11111", mode: "offline" as const, slots: [{ from: 25, to: 265, rooms: ["11", "12", "13"] }], tick: [1, 0.5, 0], ready: [true, false, false] },
    { name: "Globex Capital", spoc: "Arjun Mehta", phone: "+91 98200 22222", mode: "hybrid" as const, slots: [{ from: 120, to: 360, rooms: ["21", "22", "23", "24"] }], tick: [1, 1, 0.3, 0], ready: [true, false, false, false] },
    { name: "Initech Consulting", spoc: "Kavya Iyer", phone: "+91 98200 33333", mode: "online" as const, slots: [{ from: 90, to: 330, rooms: ["100", "101"] }], tick: [1, 1], ready: [true, true] },
    { name: "Umbrella Health", spoc: "Dev Khanna", phone: "+91 98200 44444", mode: "offline" as const, slots: [{ from: 1440 + 60, to: 1440 + 300, rooms: ["31", "32"] }, { from: 2880 + 60, to: 2880 + 240, rooms: ["201"] }], tick: [0, 0, 0], ready: [false, false, false] },
    { name: "Hooli Labs", spoc: "Neha Kapoor", phone: "+91 98200 55555", mode: "offline" as const, slots: [{ from: -600, to: -360, rooms: ["14", "15"] }], tick: [1, 1], ready: [true, true] },
  ];

  for (const p of plans) {
    const [company] = await db
      .insert(s.companies)
      .values({ name: p.name, spocName: p.spoc, spocPhone: p.phone, mode: p.mode, notes: p.mode === "hybrid" ? "Room 24 takes the online panel; needs the projector set up." : "" })
      .returning();
    const items = presets.filter((x) => x.modes.includes(p.mode)).map((x, sort) => ({ label: x.label, group: x.group, qty: x.label === "Chair" ? 4 : x.label === "Water" ? 6 : null, note: "", sort }));
    await db.insert(s.companyItems).values(items.map((i) => ({ ...i, companyId: company.id })));
    let ri = 0;
    for (const sl of p.slots) {
      const [slot] = await db.insert(s.slots).values({ companyId: company.id, startsAt: at(sl.from), endsAt: at(sl.to) }).returning();
      for (const n of sl.rooms) {
        const frac = p.tick[ri] ?? 0;
        const ready = p.ready[ri] ?? false;
        ri++;
        const [a] = await db
          .insert(s.assignments)
          .values({ slotId: slot.id, roomId: room(n), doneAt: ready ? new Date() : null, doneById: ready ? member.id : null })
          .returning();
        await db.insert(s.tasks).values(
          items.map((i, idx) => ({
            assignmentId: a.id,
            label: i.label,
            group: i.group,
            qty: i.qty,
            note: "",
            sort: i.sort,
            doneAt: idx < Math.round(items.length * frac) ? new Date() : null,
            doneById: idx < Math.round(items.length * frac) ? member.id : null,
          })),
        );
        if (p.name === "Globex Capital" && n === "23")
          await db.insert(s.comments).values({ assignmentId: a.id, memberId: member.id, authorName: member.name, body: "Projector remote is missing. Asked IT, waiting." });
      }
    }
  }
  console.log(`Added ${plans.length} demo companies (${TRAY} included where the mode calls for it).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
