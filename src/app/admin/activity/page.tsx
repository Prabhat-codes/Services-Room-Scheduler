import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getActivity } from "@/server/admin-data";
import { dayKey, dayLabel, fmtTime } from "@/lib/time";
import { Empty, Page, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  await requireAdmin();
  const rows = await getActivity();
  const now = new Date();
  const days = [...new Set(rows.map((r) => dayKey(r.at)))];
  return (
    <Page className="max-w-4xl">
      <PageHeader title="Activity" sub="Every tick, ready room, comment and admin change, newest first. Shows the latest 300." />
      {rows.length === 0 && <Empty>Nothing has happened yet.</Empty>}
      {days.map((d) => {
        const list = rows.filter((r) => dayKey(r.at) === d);
        return (
          <section key={d} className="flex flex-col gap-2">
            <h2 className="text-[16px] font-bold text-ink-2">{dayLabel(list[0].at, now)}</h2>
            <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {list.map((r) => (
                <li key={r.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-[15px]">
                  <time className="tnum text-[14px] text-ink-3" dateTime={r.at.toISOString()}>
                    {fmtTime(r.at)}
                  </time>
                  <p className="leading-snug">
                    {r.summary}
                    {r.companyId && r.assignmentId && (
                      <Link href={`/admin/companies/${r.companyId}/rooms/${r.assignmentId}`} className="ml-1.5 text-[13px] font-semibold text-accent">
                        Open room
                      </Link>
                    )}
                    <span className="block text-[13px] text-ink-3">{r.actorName}</span>
                  </p>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </Page>
  );
}
