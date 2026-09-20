import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import type { BoardCompany } from "@/server/board";
import { dayLabel, fmtRange, fmtTime, relative } from "@/lib/time";
import { StatusPill } from "@/components/status";
import { CallButton } from "./call";
import { MiniPlates } from "./plates";

export function companySummary(c: BoardCompany) {
  const total = c.focus.length;
  const ready = c.focus.filter((r) => r.status === "ready").length;
  const late = c.focus.filter((r) => r.status === "late").length;
  if (c.status === "over") return "Finished";
  if (c.status === "ready") return total === 1 ? "Room ready" : `All ${total} rooms ready`;
  if (c.status === "late") return `${late} room${late === 1 ? "" : "s"} not ready`;
  return `${ready} of ${total} ready`;
}

function whenLine(c: BoardCompany, now: Date) {
  if (c.past) return c.lastEnd ? `Ended ${dayLabel(c.lastEnd, now).toLowerCase() === "today" ? fmtTime(c.lastEnd) : dayLabel(c.lastEnd, now)}` : "";
  const live = c.slots.filter((s) => !s.over);
  const first = live[0];
  if (!first) return "No time slots yet";
  const onNow = first.startsAt <= now;
  const more = live.length > 1 ? `, +${live.length - 1} more slot${live.length > 2 ? "s" : ""}` : "";
  if (onNow) return `On now, until ${fmtTime(first.endsAt)}${more}`;
  return `${dayLabel(first.startsAt, now)}, ${fmtRange(first.startsAt, first.endsAt)} (${relative(first.startsAt, now)})${more}`;
}

export function CompanyRow({ c, now }: { c: BoardCompany; now: Date }) {
  const rooms = c.past ? c.slots.flatMap((s) => s.rooms) : c.focus;
  return (
    <li className="relative flex flex-col gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-display text-[28px] font-extrabold leading-[0.95] tracking-tight">
          <Link href={`/companies/${c.id}`} className="after:absolute after:inset-0 after:content-['']">
            {c.name}
          </Link>
        </h3>
        <StatusPill status={c.status} className="mt-0.5 shrink-0">
          {companySummary(c)}
        </StatusPill>
      </div>
      <p className="tnum -mt-1 text-[15px] text-ink-2">{whenLine(c, now)}</p>
      {rooms.length > 0 && <MiniPlates rooms={rooms} />}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[15px]">
          <span className="text-ink-3">SPOC </span>
          <span className="font-semibold">{c.spocName || "Not set"}</span>
          {c.openComments > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[14px] font-semibold text-late">
              <MessageSquareText aria-hidden className="size-4" />
              {c.openComments} open
            </span>
          )}
        </p>
        {!c.past && <CallButton name={c.spocName} phone={c.spocPhone} compact />}
      </div>
    </li>
  );
}
