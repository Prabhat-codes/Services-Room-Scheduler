import Link from "next/link";
import { clsx } from "clsx";
import { Check, MessageSquareText } from "lucide-react";
import type { BoardRoom } from "@/server/board";
import { Meter } from "@/components/status";

/** Door-plate tile for one room. */
export function RoomPlate({ room, href, startsAt, now }: { room: BoardRoom; href: string; startsAt: Date; now: Date }) {
  const mins = Math.round((startsAt.getTime() - now.getTime()) / 60000);
  const caption =
    room.status === "ready"
      ? `Ready${room.doneBy ? `, ${room.doneBy.split(" ")[0]}` : ""}`
      : room.status === "over"
        ? room.doneAt
          ? "Was ready"
          : "Finished"
        : room.status === "late"
          ? mins > 0
            ? `Starts in ${mins} min`
            : "Already started"
          : `${room.ticked} of ${room.total} ticked`;

  return (
    <Link
      href={href}
      data-status={room.status}
      className="plate flex min-h-[148px] flex-col px-4 pb-3.5 pt-6 transition active:scale-[0.98]"
      aria-label={`Room ${room.number}, ${room.building}. ${caption}`}
    >
      {room.openComments > 0 && (
        <span className="absolute right-3 top-6 inline-flex items-center gap-1 rounded-full bg-surface/80 px-1.5 py-0.5 text-[12px] font-bold">
          <MessageSquareText aria-hidden className="size-3.5" />
          {room.openComments}
        </span>
      )}
      <span className="tnum font-display text-[56px] font-extrabold leading-[0.85] tracking-tight">{room.number}</span>
      <span className="mt-1.5 text-[14px] font-semibold opacity-80">
        {room.building}
        {room.floor ? `, ${room.floor}` : ""}
      </span>
      <span className="mt-auto flex flex-col gap-1.5 pt-3">
        {room.status !== "ready" && room.status !== "over" && <Meter value={room.ticked} total={room.total} status={room.status} />}
        <span className="flex items-center gap-1 text-[14px] font-bold">
          {room.status === "ready" && <Check aria-hidden className="size-4" strokeWidth={3} />}
          {caption}
        </span>
      </span>
    </Link>
  );
}

/** Compact row of room numbers coloured by status, for list views. */
export function MiniPlates({ rooms, className }: { rooms: BoardRoom[]; className?: string }) {
  return (
    <ul className={clsx("flex flex-wrap gap-1.5", className)} aria-label="Rooms">
      {rooms.map((r) => (
        <li
          key={r.id}
          data-status={r.status}
          title={`${r.building} ${r.number}`}
          className="tnum flex h-8 min-w-11 items-center justify-center gap-0.5 rounded-md border border-[color-mix(in_oklab,var(--tone)_50%,transparent)] bg-(--tone-soft) px-1.5 font-display text-[17px] font-extrabold text-(--tone-ink)"
        >
          {r.status === "ready" && <Check aria-hidden className="size-3.5" strokeWidth={3.5} />}
          {r.number}
        </li>
      ))}
    </ul>
  );
}
