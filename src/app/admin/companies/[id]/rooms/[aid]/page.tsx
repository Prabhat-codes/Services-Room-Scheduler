import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { getAssignment } from "@/server/board";
import { getPresets } from "@/server/admin-data";
import { dayLabel, fmtRange, fmtTime } from "@/lib/time";
import { Page, PageHeader } from "@/components/admin/ui";
import { StatusPill } from "@/components/status";
import { Comments } from "@/components/runner/comments";
import { RoomChecklistEditor } from "@/components/admin/room-checklist-editor";
import { adminCommentAction } from "@/app/actions/admin";
import { LiveRefresh } from "@/components/live-refresh";

export async function generateMetadata({ params }: PageProps<"/admin/companies/[id]/rooms/[aid]">): Promise<Metadata> {
  const a = await getAssignment(Number((await params).aid));
  return { title: a ? `${a.companyName}, room ${a.number}` : "Room" };
}

export default async function AdminRoomPage({ params }: PageProps<"/admin/companies/[id]/rooms/[aid]">) {
  await requireAdmin();
  const { id, aid } = await params;
  const a = Number.isInteger(Number(aid)) ? await getAssignment(Number(aid)) : null;
  if (!a || a.companyId !== Number(id)) notFound();
  const presets = await getPresets();
  const now = new Date();
  const ticked = a.tasks.filter((t) => t.doneAt).length;

  return (
    <Page className="max-w-5xl">
      <div className="flex flex-col gap-3">
        <Link href={`/admin/companies/${a.companyId}`} className="text-[14px] font-semibold text-accent">
          {a.companyName}
        </Link>
        <PageHeader
          title={`${a.building} ${a.number}`}
          sub={
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill status={a.status} />
              <span className="tnum">
                {dayLabel(a.startsAt, now)}, {fmtRange(a.startsAt, a.endsAt)}
              </span>
              {a.doneAt && (
                <span>
                  Marked ready by {a.doneBy ?? "a runner"} at {fmtTime(a.doneAt)}
                </span>
              )}
            </span>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[19px] font-bold">Progress</h2>
            <span className="tnum text-[14px] text-ink-2">
              {ticked} of {a.tasks.length} ticked
            </span>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {a.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span
                  aria-label={t.doneAt ? "Ticked" : "Not ticked"}
                  className={
                    t.doneAt
                      ? "grid size-5 place-items-center rounded-[5px] bg-ready text-white dark:text-ready-soft"
                      : "size-5 rounded-[5px] border-2 border-ink-3/50"
                  }
                >
                  {t.doneAt && <Check aria-hidden className="size-3.5" strokeWidth={3.5} />}
                </span>
                <span className="min-w-0 flex-1 text-[15px]">
                  {t.label}
                  {t.group && <span className="text-ink-3">, {t.group}</span>}
                  {t.qty ? <span className="tnum font-bold"> ×{t.qty}</span> : null}
                </span>
                {t.doneAt && (
                  <span className="shrink-0 text-[13px] text-ink-3">
                    {t.doneBy ?? "Runner"}, {fmtTime(t.doneAt)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <RoomChecklistEditor
            assignmentId={a.id}
            customized={a.customized}
            items={a.tasks.map((t) => ({ label: t.label, group: t.group, qty: t.qty, note: t.note }))}
            presets={presets.filter((p) => p.active).map((p) => ({ label: p.label, group: p.group, defaultQty: p.defaultQty }))}
          />
          <Comments
            admin
            post={adminCommentAction}
            assignmentId={a.id}
            comments={a.comments.map((c) => ({
              id: c.id,
              author: c.authorName,
              body: c.body,
              at: c.createdAt.toISOString(),
              resolved: !!c.resolvedAt,
              byAdmin: c.memberId === null,
            }))}
          />
        </div>
      </div>
      <LiveRefresh every={15_000} />
    </Page>
  );
}
