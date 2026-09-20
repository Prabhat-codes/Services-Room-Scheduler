import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { getBoard, type BoardRoom } from "@/server/board";
import { getBuildings } from "@/server/admin-data";
import { dayKey, dayLabel, fmtDay, fmtRange, fromIst } from "@/lib/time";
import { Empty, Page, PageHeader, SegmentLegend, Tabs, btn } from "@/components/admin/ui";
import { roomStatusText } from "@/components/status";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata: Metadata = { title: "Rooms" };

type Booking = { room: BoardRoom; companyId: number; company: string; startsAt: Date; endsAt: Date };

export default async function RoomsView({ searchParams }: PageProps<"/admin/rooms">) {
  await requireAdmin();
  const sp = await searchParams;
  const now = new Date();
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : dayKey(now);
  const buildings = await getBuildings();
  const board = await getBoard({ now });
  const building = buildings.find((b) => String(b.id) === sp.b) ?? buildings[0];

  const bookings = new Map<number, Booking[]>();
  for (const c of board)
    for (const sl of c.slots) {
      if (dayKey(sl.startsAt) !== date && dayKey(sl.endsAt) !== date) continue;
      for (const r of sl.rooms) {
        const list = bookings.get(r.roomId) ?? [];
        list.push({ room: r, companyId: c.id, company: c.name, startsAt: sl.startsAt, endsAt: sl.endsAt });
        bookings.set(r.roomId, list);
      }
    }
  for (const list of bookings.values()) list.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const shift = (days: number) => dayKey(new Date(fromIst(date, "12:00").getTime() + days * 864e5));
  const href = (d: string, b = building?.id) => `/admin/rooms?b=${b}&date=${d}`;
  const floors = building ? [...new Set(building.rooms.map((r) => r.floor))] : [];
  const dateObj = fromIst(date, "12:00");

  return (
    <Page>
      <PageHeader
        title="Rooms"
        sub={`${dayLabel(dateObj, now)}${dayLabel(dateObj, now) === fmtDay(dateObj) ? "" : `, ${fmtDay(dateObj)}`}. What is happening in every room, floor by floor.`}
        actions={
          <div className="flex items-center gap-1">
            <Link href={href(shift(-1))} className={btn.quiet} aria-label="Previous day">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={href(dayKey(now))} className={btn.quiet}>
              Today
            </Link>
            <Link href={href(shift(1))} className={btn.quiet} aria-label="Next day">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      />

      {!building ? (
        <Empty>
          No buildings yet.{" "}
          <Link href="/admin/setup" className={btn.link}>
            Add one in Setup
          </Link>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              current={String(building.id)}
              tabs={buildings.map((b) => ({ key: String(b.id), label: b.name, href: href(date, b.id), count: b.rooms.filter((r) => bookings.has(r.id)).length }))}
            />
            <SegmentLegend keys={["ready", "working", "idle", "late", "over"]} />
          </div>

          {floors.map((floor) => (
            <section key={floor} className="flex flex-col gap-3">
              <h2 className="text-[17px] font-bold text-ink-2">{floor || "Rooms"}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {building.rooms
                  .filter((r) => r.floor === floor)
                  .map((r) => (
                    <RoomCard key={r.id} number={r.number} active={r.active} bookings={bookings.get(r.id) ?? []} now={now} />
                  ))}
              </ul>
            </section>
          ))}
        </>
      )}
      <LiveRefresh every={15_000} />
    </Page>
  );
}

function RoomCard({ number, active, bookings, now }: { number: string; active: boolean; bookings: Booking[]; now: Date }) {
  // The card takes the tone of whatever is on now, else the next booking, else the last one.
  const focus = bookings.find((b) => b.endsAt > now) ?? bookings.at(-1);
  return (
    <li
      data-status={focus?.room.status}
      className={clsx(
        "flex min-h-[132px] flex-col",
        focus ? "plate" : "relative rounded-[10px] border-[1.5px] border-dashed border-line bg-surface/60",
        !active && "opacity-50",
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-3.5 pt-5">
        <span className="tnum font-display text-[40px] font-extrabold leading-[0.85] tracking-tight">{number}</span>
        {focus && <span className="text-[12px] font-bold">{roomStatusText[focus.room.status]}</span>}
      </div>
      {bookings.length === 0 ? (
        <p className="px-3.5 pb-3 pt-2 text-[14px] text-ink-3">{active ? "Free" : "Inactive"}</p>
      ) : (
        <ul className="flex flex-col gap-1 px-2 pb-2 pt-2">
          {bookings.map((b) => (
            <li key={b.room.id}>
              <Link
                href={`/admin/companies/${b.companyId}/rooms/${b.room.id}`}
                data-status={b.room.status}
                className="block rounded-md bg-surface/75 px-2 py-1.5 text-ink transition hover:bg-surface"
              >
                <span className="flex items-center gap-1.5 text-[14px] font-bold leading-tight">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-(--tone)" />
                  <span className="truncate">{b.company}</span>
                  {b.room.openComments > 0 && (
                    <span className="ml-auto inline-flex items-center gap-0.5 text-[12px] text-late">
                      <MessageSquareText aria-hidden className="size-3.5" />
                      {b.room.openComments}
                    </span>
                  )}
                </span>
                <span className="tnum block text-[12px] text-ink-2">
                  {fmtRange(b.startsAt, b.endsAt)}
                  {b.room.status !== "ready" && b.room.status !== "over" ? `, ${b.room.ticked}/${b.room.total}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
