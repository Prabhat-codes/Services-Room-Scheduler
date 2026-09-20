import { clsx } from "clsx";
import { Phone } from "lucide-react";

export function CallButton({ name, phone, className, compact }: { name: string; phone: string; className?: string; compact?: boolean }) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      className={clsx(
        "relative z-10 inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent font-bold text-accent-ink transition active:scale-95",
        compact ? "size-11" : "px-5 py-3 text-[16px]",
        className,
      )}
      aria-label={`Call ${name || "SPOC"}`}
    >
      <Phone aria-hidden className="size-[18px]" strokeWidth={2.5} />
      {!compact && <span>Call {name.split(" ")[0] || "SPOC"}</span>}
    </a>
  );
}

export const modeText = { offline: "In person", online: "Online", hybrid: "Hybrid" } as const;
