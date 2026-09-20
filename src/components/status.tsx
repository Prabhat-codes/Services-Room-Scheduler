import { clsx } from "clsx";
import type { CompanyStatus, RoomStatus } from "@/server/types";

export const roomStatusText: Record<RoomStatus, string> = {
  idle: "Not started",
  working: "In progress",
  ready: "Ready",
  late: "Not ready",
  over: "Finished",
};

/** Small pill that states status in words as well as colour. */
export function StatusPill({ status, children, className }: { status: RoomStatus | CompanyStatus; children?: React.ReactNode; className?: string }) {
  return (
    <span
      data-status={status}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full bg-(--tone-soft) px-2.5 py-0.5 text-[13px] font-semibold leading-5 text-(--tone-ink)",
        className,
      )}
    >
      <span aria-hidden className={clsx("size-2 rounded-full bg-(--tone)", status === "late" && "motion-safe:animate-pulse")} />
      {children ?? roomStatusText[status]}
    </span>
  );
}

/** Thin progress bar in the status tone. */
export function Meter({ value, total, status, className }: { value: number; total: number; status: RoomStatus; className?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div
      data-status={status}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      className={clsx("h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tone)_18%,transparent)]", className)}
    >
      <div className="h-full rounded-full bg-(--tone) transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}
