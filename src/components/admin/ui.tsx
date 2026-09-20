import Link from "next/link";
import { clsx } from "clsx";
import type { BoardRoom } from "@/server/board";
import type { RoomStatus } from "@/server/types";

export const input =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none transition placeholder:text-ink-3 focus:border-accent focus:ring-3 focus:ring-accent-soft";
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-[15px] font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50",
  quiet:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-[15px] font-semibold text-ink transition hover:bg-sunk disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-late/40 px-3.5 py-2 text-[15px] font-semibold text-late transition hover:bg-late-soft disabled:opacity-50",
  link: "font-semibold text-accent hover:underline",
};

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[40px] font-extrabold leading-none tracking-tight lg:text-[48px]">{title}</h1>
        {sub && <p className="mt-1.5 text-[15px] text-ink-2">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={clsx("mx-auto flex max-w-[1240px] flex-col gap-7 px-4 pb-20 pt-6 lg:px-8 lg:pt-9", className)}>{children}</main>;
}

export function Tabs({ tabs, current }: { tabs: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <div role="tablist" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-sunk p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          role="tab"
          aria-selected={t.key === current}
          href={t.href}
          className={clsx(
            "shrink-0 rounded-lg px-3.5 py-1.5 text-[14px] font-semibold transition",
            t.key === current ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="tnum ml-1.5 text-ink-3">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

/** Stat tile: label, big value, optional context line. Value uses the body face per the dataviz spec. */
export function StatTile({ label, value, sub, status }: { label: string; value: React.ReactNode; sub?: React.ReactNode; status?: RoomStatus }) {
  return (
    <div
      data-status={status}
      className={clsx("rounded-xl border border-line bg-surface px-4 py-3.5", status && "border-[color-mix(in_oklab,var(--tone)_45%,var(--line))]")}
    >
      <p className="text-[14px] text-ink-2">{label}</p>
      <p className={clsx("mt-0.5 text-[34px] font-bold leading-tight", status ? "text-(--tone-ink)" : "text-ink")}>{value}</p>
      {sub && <div className="mt-1 text-[13px] text-ink-3">{sub}</div>}
    </div>
  );
}

const SEGMENTS: { key: RoomStatus; label: string; cls: string }[] = [
  { key: "ready", label: "Ready", cls: "bg-ready" },
  { key: "working", label: "In progress", cls: "bg-pending" },
  { key: "idle", label: "Not started", cls: "bg-pending-soft border border-pending/60" },
  { key: "late", label: "Not ready, due soon", cls: "bg-late" },
  { key: "over", label: "Finished", cls: "bg-over" },
];

/** Segmented bar of room statuses; 2px surface gaps between segments. */
export function SegmentBar({ rooms, className }: { rooms: Pick<BoardRoom, "status">[]; className?: string }) {
  const counts = SEGMENTS.map((s) => ({ ...s, n: rooms.filter((r) => r.status === s.key).length })).filter((s) => s.n);
  const label = counts.map((c) => `${c.n} ${c.label.toLowerCase()}`).join(", ");
  return (
    <div className={clsx("flex h-2.5 gap-[2px]", className)} role="img" aria-label={label || "No rooms"} title={label}>
      {counts.map((c) => (
        <div key={c.key} className={clsx("rounded-[3px]", c.cls)} style={{ flexGrow: c.n }} />
      ))}
      {!counts.length && <div className="flex-1 rounded-[3px] bg-sunk" />}
    </div>
  );
}

export function SegmentLegend({ keys = ["ready", "working", "idle", "late"] }: { keys?: RoomStatus[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
      {SEGMENTS.filter((s) => keys.includes(s.key)).map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className={clsx("h-2.5 w-4 rounded-[3px]", s.cls)} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[15px] text-ink-3">{children}</p>;
}
