import Link from "next/link";
import { ChevronLeft, LogOut } from "lucide-react";
import { logout } from "@/app/actions/runner";
import { ServicesMark } from "@/components/logo";

export function RunnerHeader({ name, back }: { name: string; back?: { href: string; label: string } }) {
  const first = name.split(" ")[0];
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-3 px-4">
        {back ? (
          <Link href={back.href} className="-ml-2 flex min-w-0 items-center gap-0.5 rounded-lg py-2 pl-1 pr-2 text-[16px] font-semibold text-accent">
            <ChevronLeft aria-hidden className="size-5 shrink-0" strokeWidth={2.5} />
            <span className="truncate">{back.label}</span>
          </Link>
        ) : (
          <Link href="/companies" className="flex items-center gap-2 font-display text-[26px] font-extrabold tracking-tight">
            <ServicesMark className="size-6" />
            Room Checker
          </Link>
        )}
        <details className="relative shrink-0">
          <summary className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[15px] font-semibold">
            <span aria-hidden className="grid size-7 place-items-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
              {first[0]}
            </span>
            {first}
          </summary>
          <div className="absolute right-0 top-11 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-black/10">
            <p className="px-3 pb-2 pt-1.5 text-[14px] text-ink-3">Signed in as {name}</p>
            <form action={logout}>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold hover:bg-sunk">
                <LogOut aria-hidden className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
