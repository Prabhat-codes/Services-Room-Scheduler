import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { requireRunner } from "@/lib/session";
import { getBoard, type BoardSlot } from "@/server/board";
import { dayLabel, fmtRange } from "@/lib/time";
import { RunnerHeader } from "@/components/runner/header";
import { CallButton, modeText } from "@/components/runner/call";
import { RoomPlate } from "@/components/runner/plates";
import { StatusPill } from "@/components/status";
import { companySummary } from "@/components/runner/company-row";

export async function generateMetadata({ params }: PageProps<"/companies/[id]">): Promise<Metadata> {
  const [c] = await getBoard({ companyId: Number((await params).id) });
  return { title: c?.name ?? "Company" };
}

export default async function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  const me = await requireRunner();
  const id = Number((await params).id);
  const now = new Date();
  const [c] = Number.isInteger(id) ? await getBoard({ companyId: id, now }) : [];
  if (!c) notFound();
  const live = c.slots.filter((s) => !s.over);
  const done = c.slots.filter((s) => s.over);

  return (
    <>
      <RunnerHeader name={me.name} back={{ href: "/companies", label: "Companies" }} />
      <main className="mx-auto flex max-w-xl flex-col gap-7 px-4 pb-16 pt-5">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[46px] font-extrabold leading-[0.9] tracking-tight">{c.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={c.status}>{companySummary(c)}</StatusPill>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[13px] font-semibold text-ink-2">{modeText[c.mode]}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[14px] text-ink-3">SPOC, for anything the room needs</p>
            <p className="truncate text-[18px] font-bold">{c.spocName || "Not set yet"}</p>
            {c.spocPhone && <p className="tnum text-[15px] text-ink-2">{c.spocPhone}</p>}
          </div>
          <CallButton name={c.spocName} phone={c.spocPhone} />
        </div>

        {c.notes && (
          <p className="whitespace-pre-line rounded-2xl bg-accent-soft px-4 py-3 text-[15px] leading-relaxed text-ink">
            <span className="font-bold">Note from the admin: </span>
            {c.notes}
          </p>
        )}

        {live.map((s) => (
          <SlotSection key={s.id} slot={s} companyId={c.id} now={now} />
        ))}
        {live.length === 0 && <p className="text-[15px] text-ink-3">This company has finished. Its rooms are listed below.</p>}

        {done.length > 0 && (
          <details className="group rounded-2xl border border-line bg-surface" open={live.length === 0}>
            <summary className="flex items-center px-4 py-4 text-[17px] font-bold">
              Earlier slots <span className="ml-1 font-normal text-ink-3">({done.length})</span>
              <ChevronDown aria-hidden className="ml-auto size-5 text-ink-3 transition group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-6 border-t border-line px-4 py-4">
              {done.map((s) => (
                <SlotSection key={s.id} slot={s} companyId={c.id} now={now} />
              ))}
            </div>
          </details>
        )}
      </main>
    </>
  );
}

function SlotSection({ slot, companyId, now }: { slot: BoardSlot; companyId: number; now: Date }) {
  const ready = slot.rooms.filter((r) => r.status === "ready").length;
  const onNow = slot.startsAt <= now && !slot.over;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="tnum text-[17px] font-bold">
          {dayLabel(slot.startsAt, now)}, {fmtRange(slot.startsAt, slot.endsAt)}
        </h2>
        {!slot.over && (
          <span className="tnum shrink-0 text-[14px] text-ink-3">
            {onNow ? "On now" : `${ready}/${slot.rooms.length} ready`}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {slot.rooms.map((r) => (
          <RoomPlate key={r.id} room={r} startsAt={slot.startsAt} now={now} href={`/companies/${companyId}/rooms/${r.id}`} />
        ))}
      </div>
    </section>
  );
}
