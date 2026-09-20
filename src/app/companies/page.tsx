import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { requireRunner } from "@/lib/session";
import { getBoard } from "@/server/board";
import { dayKey, fmtDay } from "@/lib/time";
import { RunnerHeader } from "@/components/runner/header";
import { CompanyRow } from "@/components/runner/company-row";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const me = await requireRunner();
  const now = new Date();
  const board = await getBoard({ now });
  const today = dayKey(now);
  const current = board.filter((c) => !c.past);
  const todays = current.filter((c) => c.focusDay === null || c.focusDay <= today);
  const later = current.filter((c) => c.focusDay !== null && c.focusDay > today);
  const past = board.filter((c) => c.past);

  return (
    <>
      <RunnerHeader name={me.name} />
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 pb-16 pt-6">
        <div>
          <h1 className="font-display text-[44px] font-extrabold leading-none tracking-tight">Companies</h1>
          <p className="mt-1 text-[15px] text-ink-2">{fmtDay(now)}. Tap a company to see its rooms.</p>
        </div>

        <Section title="Today" empty="No companies today." list={todays} now={now} />
        {later.length > 0 && <Section title="Coming up" list={later} now={now} />}

        {past.length > 0 && (
          <details className="group rounded-2xl border border-line bg-surface">
            <summary className="flex items-center justify-between px-4 py-4 text-[17px] font-bold">
              Past companies <span className="font-normal text-ink-3">({past.length})</span>
              <ChevronDown aria-hidden className="ml-auto size-5 text-ink-3 transition group-open:rotate-180" />
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {past.map((c) => (
                <CompanyRow key={c.id} c={c} now={now} />
              ))}
            </ul>
          </details>
        )}
      </main>
    </>
  );
}

function Section({ title, list, now, empty }: { title: string; list: Awaited<ReturnType<typeof getBoard>>; now: Date; empty?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[17px] font-bold text-ink-2">
        {title} <span className="font-normal text-ink-3">({list.length})</span>
      </h2>
      {list.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {list.map((c) => (
            <CompanyRow key={c.id} c={c} now={now} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[15px] text-ink-3">{empty}</p>
      )}
    </section>
  );
}
