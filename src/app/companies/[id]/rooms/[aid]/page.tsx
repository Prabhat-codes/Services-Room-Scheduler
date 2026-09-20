import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRunner } from "@/lib/session";
import { getAssignment } from "@/server/board";
import { dayLabel, fmtRange, relative } from "@/lib/time";
import { RunnerHeader } from "@/components/runner/header";
import { CallButton } from "@/components/runner/call";
import { StatusPill } from "@/components/status";
import { Checklist } from "@/components/runner/checklist";
import { Comments } from "@/components/runner/comments";
import { postComment } from "@/app/actions/runner";

export async function generateMetadata({ params }: PageProps<"/companies/[id]/rooms/[aid]">): Promise<Metadata> {
  const a = await getAssignment(Number((await params).aid));
  return { title: a ? `Room ${a.number}` : "Room" };
}

export default async function RoomPage({ params }: PageProps<"/companies/[id]/rooms/[aid]">) {
  const me = await requireRunner();
  const { id, aid } = await params;
  const a = Number.isInteger(Number(aid)) ? await getAssignment(Number(aid)) : null;
  if (!a || a.companyId !== Number(id)) notFound();
  const now = new Date();
  const onNow = a.startsAt <= now && a.endsAt > now;

  return (
    <>
      <RunnerHeader name={me.name} back={{ href: `/companies/${a.companyId}`, label: a.companyName }} />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 pb-44 pt-5">
        <div data-status={a.status} className="plate flex items-end justify-between gap-4 px-5 pb-4 pt-7">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold opacity-80">
              {a.building}
              {a.floor ? `, ${a.floor}` : ""}
            </p>
            <h1 className="tnum font-display text-[84px] font-extrabold leading-[0.8] tracking-tight">{a.number}</h1>
          </div>
          <StatusPill status={a.status} className="mb-1 bg-surface/70" />
        </div>

        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-[15px]">
          <dt className="text-ink-3">Company</dt>
          <dd className="font-semibold">{a.companyName}</dd>
          <dt className="text-ink-3">Time</dt>
          <dd className="tnum font-semibold">
            {dayLabel(a.startsAt, now)}, {fmtRange(a.startsAt, a.endsAt)}{" "}
            <span className="font-normal text-ink-2">({onNow ? "on now" : a.endsAt <= now ? "finished" : relative(a.startsAt, now)})</span>
          </dd>
          <dt className="text-ink-3">SPOC</dt>
          <dd className="flex items-center justify-between gap-3">
            <span className="font-semibold">{a.spocName || "Not set"}</span>
            <CallButton name={a.spocName} phone={a.spocPhone} compact />
          </dd>
        </dl>

        {a.customized && (
          <p className="rounded-xl bg-accent-soft px-4 py-3 text-[15px]">This room has its own list, different from the company&rsquo;s other rooms.</p>
        )}
        {a.notes && <p className="whitespace-pre-line rounded-xl border border-line px-4 py-3 text-[15px] text-ink-2">{a.notes}</p>}

        <Checklist
          key={a.id}
          assignmentId={a.id}
          tasks={a.tasks.map((t) => ({ ...t, doneAt: t.doneAt?.toISOString() ?? null }))}
          readyAt={a.doneAt?.toISOString() ?? null}
          readyBy={a.doneBy}
          over={a.status === "over"}
          me={me.name}
        />

        <Comments
          post={postComment}
          assignmentId={a.id}
          comments={a.comments.map((c) => ({ id: c.id, author: c.authorName, body: c.body, at: c.createdAt.toISOString(), resolved: !!c.resolvedAt, byAdmin: c.memberId === null }))}
        />
      </main>
    </>
  );
}
