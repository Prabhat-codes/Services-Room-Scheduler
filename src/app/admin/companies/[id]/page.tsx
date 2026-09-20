import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MessageSquareText, Pencil, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { getBoard } from "@/server/board";
import { getCompanyForEdit } from "@/server/admin-data";
import { dayLabel, fmtRange, fmtTime } from "@/lib/time";
import { Page, PageHeader, SegmentBar, btn } from "@/components/admin/ui";
import { StatusPill, roomStatusText } from "@/components/status";
import { companySummary } from "@/components/runner/company-row";
import { modeText } from "@/components/runner/call";
import { CompanyActions } from "@/components/admin/company-actions";
import { LiveRefresh } from "@/components/live-refresh";

export async function generateMetadata({ params }: PageProps<"/admin/companies/[id]">): Promise<Metadata> {
  const c = await getCompanyForEdit(Number((await params).id));
  return { title: c?.name ?? "Company" };
}

export default async function AdminCompanyPage({ params }: PageProps<"/admin/companies/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const now = new Date();
  const [c] = Number.isInteger(id) ? await getBoard({ companyId: id, now }) : [];
  const edit = Number.isInteger(id) ? await getCompanyForEdit(id) : null;
  if (!c || !edit) notFound();
  const groups = [...new Set(edit.items.map((i) => i.group))].sort((a, b) => Number(a !== null) - Number(b !== null));

  return (
    <Page>
      <div className="flex flex-col gap-3">
        <Link href="/admin" className="text-[14px] font-semibold text-accent">
          All companies
        </Link>
        <PageHeader
          title={c.name}
          sub={
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill status={c.status}>{companySummary(c)}</StatusPill>
              <span>{modeText[c.mode]}</span>
            </span>
          }
          actions={
            <>
              <Link href={`/admin/companies/${c.id}/edit`} className={btn.quiet}>
                <Pencil aria-hidden className="size-4" /> Edit
              </Link>
              <CompanyActions id={c.id} name={c.name} past={c.past} />
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {c.slots.map((s) => (
            <section key={s.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="tnum text-[18px] font-bold">
                  {dayLabel(s.startsAt, now)}, {fmtRange(s.startsAt, s.endsAt)}
                  {s.over && <span className="ml-2 text-[14px] font-normal text-ink-3">finished</span>}
                </h2>
                <SegmentBar rooms={s.rooms} className="w-40" />
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {s.rooms.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/companies/${c.id}/rooms/${r.id}`} data-status={r.status} className="plate flex min-h-[120px] flex-col px-3.5 pb-3 pt-5 transition hover:brightness-[0.98]">
                      <span className="flex items-start justify-between gap-2">
                        <span className="tnum font-display text-[44px] font-extrabold leading-[0.85] tracking-tight">{r.number}</span>
                        {r.openComments > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-surface/80 px-1.5 text-[12px] font-bold text-late">
                            <MessageSquareText aria-hidden className="size-3.5" />
                            {r.openComments}
                          </span>
                        )}
                      </span>
                      <span className="text-[13px] font-semibold opacity-80">
                        {r.building}
                        {r.customized ? ", own list" : ""}
                      </span>
                      <span className="mt-auto pt-2 text-[13px] font-bold">
                        {r.status === "ready" || (r.status === "over" && r.doneAt) ? (
                          <>
                            <Check aria-hidden className="mr-0.5 inline size-3.5" strokeWidth={3} />
                            Ready{r.doneBy ? `, ${r.doneBy}` : ""}
                            {r.doneAt ? ` ${fmtTime(r.doneAt)}` : ""}
                          </>
                        ) : (
                          `${roomStatusText[r.status]}, ${r.ticked}/${r.total}`
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="text-[15px] font-bold">SPOC</h2>
            <p className="mt-1 text-[17px] font-semibold">{c.spocName || "Not set"}</p>
            {c.spocPhone && (
              <a href={`tel:${c.spocPhone.replace(/[^\d+]/g, "")}`} className="tnum mt-0.5 inline-flex items-center gap-1.5 text-accent">
                <Phone aria-hidden className="size-4" /> {c.spocPhone}
              </a>
            )}
            {c.notes && <p className="mt-3 whitespace-pre-line border-t border-line pt-3 text-[14px] text-ink-2">{c.notes}</p>}
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="text-[15px] font-bold">Checklist ({edit.items.length} items)</h2>
            {groups.map((g) => (
              <div key={g ?? ""} className="mt-3">
                <h3 className="text-[13px] font-semibold text-ink-3">{g ?? "In the room"}</h3>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {edit.items
                    .filter((i) => i.group === g)
                    .map((i) => (
                      <li key={i.label} className="rounded-md bg-sunk px-2 py-0.5 text-[13px]">
                        {i.label}
                        {i.qty ? <span className="tnum font-bold"> ×{i.qty}</span> : null}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <LiveRefresh every={15_000} />
    </Page>
  );
}
