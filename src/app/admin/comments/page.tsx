import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getComments } from "@/server/admin-data";
import { dayLabel, fmtTime } from "@/lib/time";
import { Empty, Page, PageHeader, Tabs, btn } from "@/components/admin/ui";
import { ResolveButton } from "@/components/admin/resolve-button";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata: Metadata = { title: "Comments" };

export default async function CommentsPage({ searchParams }: PageProps<"/admin/comments">) {
  await requireAdmin();
  const { show } = await searchParams;
  const filter = show === "resolved" || show === "all" ? show : "open";
  const list = await getComments(filter);
  const open = filter === "open" ? null : await getComments("open");
  const now = new Date();

  return (
    <Page className="max-w-4xl">
      <PageHeader title="Comments" sub="Issues runners raised from the rooms. Resolve them once they are handled." />
      <Tabs
        current={filter}
        tabs={[
          { key: "open", label: "Open", href: "/admin/comments", count: (open ?? list).length },
          { key: "resolved", label: "Resolved", href: "/admin/comments?show=resolved" },
          { key: "all", label: "All", href: "/admin/comments?show=all" },
        ]}
      />
      {list.length === 0 ? (
        <Empty>{filter === "open" ? "No open comments. Every reported issue has been handled." : "Nothing here yet."}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((c) => (
            <li
              key={c.id}
              data-status={c.resolvedAt ? "over" : "late"}
              className="flex flex-col gap-3 rounded-xl border border-line border-l-4 border-l-(--tone) bg-surface px-4 py-3.5 sm:flex-row sm:items-start"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-ink-2">
                  <Link href={`/admin/companies/${c.companyId}`} className="font-bold text-ink hover:underline">
                    {c.company}
                  </Link>
                  {", "}
                  <Link href={`/admin/companies/${c.companyId}/rooms/${c.assignmentId}`} className={btn.link}>
                    {c.building} {c.room}
                  </Link>
                  <span className="text-ink-3">
                    {" "}
                    (slot starts {dayLabel(c.startsAt, now).toLowerCase()}, {fmtTime(c.startsAt)})
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-line text-[16px] leading-snug">{c.body}</p>
                <p className="mt-1 text-[13px] text-ink-3">
                  {c.author}, {dayLabel(c.createdAt, now)} {fmtTime(c.createdAt)}
                  {c.resolvedAt && `. Resolved ${dayLabel(c.resolvedAt, now).toLowerCase()} ${fmtTime(c.resolvedAt)}`}
                </p>
              </div>
              <ResolveButton id={c.id} resolved={!!c.resolvedAt} />
            </li>
          ))}
        </ul>
      )}
      <LiveRefresh every={15_000} />
    </Page>
  );
}
