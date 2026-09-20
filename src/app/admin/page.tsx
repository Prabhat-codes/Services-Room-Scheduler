import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, MessageSquareText, Phone } from "lucide-react";
import { isAdmin } from "@/lib/session";
import { getBoard, type BoardCompany } from "@/server/board";
import { dayKey, dayLabel, fmtDay, fmtRange, fmtTime, relative } from "@/lib/time";
import { AdminLogin } from "@/components/admin/login";
import { Empty, Page, PageHeader, SegmentBar, SegmentLegend, StatTile, Tabs, btn } from "@/components/admin/ui";
import { StatusPill } from "@/components/status";
import { MiniPlates } from "@/components/runner/plates";
import { companySummary } from "@/components/runner/company-row";
import { modeText } from "@/components/runner/call";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata: Metadata = { title: "Admin" };

type View = "today" | "upcoming" | "past";

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { view: v } = await searchParams;
  const view: View = v === "upcoming" || v === "past" ? v : "today";
  const now = new Date();
  const today = dayKey(now);
  const board = await getBoard({ now });
  const lists: Record<View, BoardCompany[]> = {
    today: board.filter((c) => !c.past && (c.focusDay === null || c.focusDay <= today)),
    upcoming: board.filter((c) => !c.past && c.focusDay !== null && c.focusDay > today),
    past: board.filter((c) => c.past),
  };
  const todayRooms = lists.today.flatMap((c) => c.focus);
  const ready = todayRooms.filter((r) => r.status === "ready").length;
  const late = todayRooms.filter((r) => r.status === "late").length;
  const comments = board.reduce((n, c) => n + c.openComments, 0);
  const list = lists[view];

  return (
    <Page>
      <PageHeader
        title="Companies"
        sub={`${fmtDay(now)}. Status updates automatically as runners tick items.`}
        actions={
          <Link href="/admin/companies/new" className={btn.primary}>
            <CalendarPlus aria-hidden className="size-4" /> Schedule a company
          </Link>
        }
      />

      <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Rooms ready today"
          value={
            <>
              {ready}
              <span className="text-[20px] font-semibold text-ink-3"> of {todayRooms.length}</span>
            </>
          }
          sub={<SegmentBar rooms={todayRooms} className="mt-1.5" />}
        />
        <StatTile
          label="Not ready, due soon"
          value={late}
          status={late ? "late" : undefined}
          sub={late ? "Inside the warning window" : "Nothing overdue"}
        />
        <StatTile label="Companies today" value={lists.today.length} sub={`${lists.upcoming.length} coming up`} />
        <StatTile
          label="Open comments"
          value={comments}
          status={comments ? "working" : undefined}
          sub={
            <Link href="/admin/comments" className={btn.link}>
              View comments
            </Link>
          }
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          current={view}
          tabs={[
            { key: "today", label: "Today", href: "/admin", count: lists.today.length },
            { key: "upcoming", label: "Coming up", href: "/admin?view=upcoming", count: lists.upcoming.length },
            { key: "past", label: "Past", href: "/admin?view=past", count: lists.past.length },
          ]}
        />
        <SegmentLegend keys={view === "past" ? ["ready", "over"] : ["ready", "working", "idle", "late"]} />
      </div>

      {list.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <CompanyPanel key={c.id} c={c} now={now} />
          ))}
        </ul>
      ) : (
        <Empty>
          {view === "today" ? "No companies today. " : view === "upcoming" ? "Nothing scheduled after today. " : "No past companies yet. "}
          <Link href="/admin/companies/new" className={btn.link}>
            Schedule a company
          </Link>
        </Empty>
      )}
      <LiveRefresh every={15_000} />
    </Page>
  );
}

function whenText(c: BoardCompany, now: Date) {
  if (c.past) return c.lastEnd ? `Ended ${dayLabel(c.lastEnd, now)}, ${fmtTime(c.lastEnd)}` : "Ended";
  const live = c.slots.filter((s) => !s.over);
  const first = live[0];
  if (!first) return "No time slots";
  const more = live.length > 1 ? `, ${live.length} slots` : "";
  if (first.startsAt <= now) return `On now, until ${fmtTime(first.endsAt)}${more}`;
  return `${dayLabel(first.startsAt, now)}, ${fmtRange(first.startsAt, first.endsAt)} (${relative(first.startsAt, now)})${more}`;
}

function CompanyPanel({ c, now }: { c: BoardCompany; now: Date }) {
  const rooms = c.past ? c.slots.flatMap((s) => s.rooms) : c.focus;
  return (
    <li className="relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div data-status={c.status} className="plate flex flex-col gap-2 rounded-none border-0 px-4 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 font-display text-[30px] font-extrabold leading-[0.95] tracking-tight">
            <Link href={`/admin/companies/${c.id}`} className="after:absolute after:inset-0 hover:underline">
              {c.name}
            </Link>
          </h2>
          <StatusPill status={c.status} className="shrink-0 bg-surface/70">
            {companySummary(c)}
          </StatusPill>
        </div>
        <p className="tnum text-[14px] font-semibold opacity-85">{whenText(c, now)}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        <SegmentBar rooms={rooms} />
        <MiniPlates rooms={rooms} />
        <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-[14px]">
          <span className="min-w-0 truncate">
            <span className="text-ink-3">SPOC </span>
            <span className="font-semibold">{c.spocName || "not set"}</span>
            {c.spocPhone && (
              <a href={`tel:${c.spocPhone.replace(/[^\d+]/g, "")}`} className="relative z-10 ml-2 inline-flex items-center gap-1 text-accent">
                <Phone aria-hidden className="size-3.5" />
                <span className="tnum">{c.spocPhone}</span>
              </a>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-ink-3">
            {c.openComments > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-late">
                <MessageSquareText aria-hidden className="size-4" />
                {c.openComments}
              </span>
            )}
            {modeText[c.mode]}
          </span>
        </div>
      </div>
    </li>
  );
}
