"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Activity, Building2, CalendarPlus, LayoutGrid, LogOut, MessageSquareText, Settings2, Users } from "lucide-react";
import { adminLogout } from "@/app/actions/admin";

const links = [
  { href: "/admin", label: "Companies", icon: LayoutGrid, exact: true },
  { href: "/admin/rooms", label: "Rooms", icon: Building2 },
  { href: "/admin/comments", label: "Comments", icon: MessageSquareText },
  { href: "/admin/companies/new", label: "Schedule", icon: CalendarPlus },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/setup", label: "Setup", icon: Settings2 },
  { href: "/admin/activity", label: "Activity", icon: Activity },
];

export function AdminNav({ openComments }: { openComments: number }) {
  const path = usePathname();
  const active = (l: (typeof links)[number]) =>
    l.exact ? path === l.href || (path.startsWith("/admin/companies/") && !path.endsWith("/new")) : path.startsWith(l.href);

  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:h-dvh lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 pb-1 pt-[max(10px,env(safe-area-inset-top))] lg:px-5 lg:pb-4 lg:pt-6">
        <Link href="/admin" className="font-display text-[26px] font-extrabold leading-none tracking-tight">
          Room Checker <span className="font-sans text-[13px] font-semibold tracking-normal text-ink-3">admin</span>
        </Link>
        <form action={adminLogout} className="lg:hidden">
          <button className="rounded-lg p-2 text-ink-3" aria-label="Sign out">
            <LogOut className="size-5" />
          </button>
        </form>
      </div>
      <ul className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3">
        {links.map((l) => (
          <li key={l.href} className="shrink-0">
            <Link
              href={l.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] font-semibold transition",
                active(l) ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-sunk",
              )}
            >
              <l.icon aria-hidden className="size-[18px]" />
              {l.label}
              {l.href === "/admin/comments" && openComments > 0 && (
                <span data-status="late" className="tnum ml-auto rounded-full bg-(--tone) px-1.5 text-[12px] font-bold leading-5 text-white">
                  {openComments}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <form action={adminLogout} className="hidden px-3 lg:absolute lg:bottom-5 lg:block lg:w-full">
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] font-semibold text-ink-3 hover:bg-sunk">
          <LogOut aria-hidden className="size-[18px]" /> Sign out
        </button>
      </form>
    </nav>
  );
}
