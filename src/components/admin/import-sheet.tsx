"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { applyImportAction, previewImportAction } from "@/app/actions/import";
import type { ImportPlan } from "@/server/import";
import { dayLabel } from "@/lib/time";
import { btn, input } from "./ui";

type Mode = "offline" | "online" | "hybrid";

export function ImportSheet({ today }: { today: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<Mode>("offline");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [done, setDone] = useState<{ companies: number; updated: number; slots: number; rooms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function preview(file: File) {
    setError(null);
    setDone(null);
    setFileName(file.name);
    const form = new FormData();
    form.set("file", file);
    form.set("date", date);
    form.set("mode", mode);
    start(async () => {
      const r = await previewImportAction(form);
      if (r.ok && r.data) setPlan(r.data);
      else {
        setPlan(null);
        setError(r.ok ? "Nothing readable in that file." : r.error);
      }
    });
  }

  function create() {
    if (!plan) return;
    setError(null);
    start(async () => {
      const r = await applyImportAction(plan);
      if (!r.ok) return setError(r.error);
      setDone(r.data ?? null);
      setPlan(null);
      router.refresh();
    });
  }

  const clashes = plan?.companies.flatMap((c) => c.slots.flatMap((s) => s.rooms.filter((r) => r.clash))) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 lg:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[14px] font-semibold">
            Date for rows without one
            <input type="date" className={clsx(input, "tnum w-auto")} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-[14px] font-semibold">
            Process, unless the sheet says otherwise
            <select className={clsx(input, "w-auto")} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="offline">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <a href="/admin/import/template" className={clsx(btn.quiet, "ml-auto")} download>
            <Download aria-hidden className="size-4" /> Download blank template
          </a>
        </div>

        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center transition hover:border-accent hover:bg-accent-soft/30"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) preview(file);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) preview(file);
            }}
          />
          <FileSpreadsheet aria-hidden className="size-8 text-ink-3" />
          <span className="text-[17px] font-bold">{pending && !plan ? "Reading the sheet…" : "Choose a spreadsheet, or drop one here"}</span>
          <span className="max-w-[46ch] text-[14px] text-ink-2">
            Columns: Company, Panel Details, Start Time, End Time, Building, Floor, Room#, Set-up Requirements. Date, SPOC Name, SPOC Phone and Mode are used too if your sheet has them.
          </span>
          {fileName && <span className="text-[13px] text-ink-3">{fileName}</span>}
        </label>

        {error && (
          <p role="alert" data-status="late" className="rounded-lg bg-(--tone-soft) px-3 py-2.5 text-[15px] font-semibold text-(--tone-ink)">
            {error}
          </p>
        )}

        {done && (
          <div data-status="ready" className="flex flex-wrap items-center gap-3 rounded-lg bg-(--tone-soft) px-4 py-3 text-(--tone-ink)">
            <CheckCircle2 aria-hidden className="size-5" />
            <p className="text-[15px] font-semibold">
              Created {done.companies} new {done.companies === 1 ? "company" : "companies"}
              {done.updated ? `, added slots to ${done.updated} existing` : ""}, {done.slots} time {done.slots === 1 ? "slot" : "slots"}, {done.rooms} rooms.
            </p>
            <a href="/admin" className={clsx(btn.quiet, "ml-auto")}>
              See the schedule
            </a>
          </div>
        )}
      </section>

      {plan && (
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 lg:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[20px] font-bold">
              Ready to create{" "}
              <span className="tnum font-normal text-ink-2">
                {plan.counts.companies} companies, {plan.counts.slots} slots, {plan.counts.rooms} rooms, from {plan.counts.rows} rows
              </span>
            </h2>
            <button className={btn.primary} onClick={create} disabled={pending || plan.counts.rooms === 0}>
              <Upload aria-hidden className="size-4" /> {pending ? "Creating…" : "Create this schedule"}
            </button>
          </div>

          {plan.problems.length > 0 && (
            <div data-status="working" className="rounded-lg bg-(--tone-soft) px-4 py-3 text-(--tone-ink)">
              <p className="flex items-center gap-2 text-[15px] font-bold">
                <AlertTriangle aria-hidden className="size-4" />
                {plan.problems.length} row{plan.problems.length === 1 ? "" : "s"} need a look
              </p>
              <ul className="mt-1.5 flex flex-col gap-0.5 text-[14px]">
                {plan.problems.map((p, i) => (
                  <li key={i}>
                    <span className="font-semibold">Row {p.row}:</span> {p.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {clashes.length > 0 && (
            <p data-status="late" className="rounded-lg bg-(--tone-soft) px-4 py-3 text-[14px] text-(--tone-ink)">
              <AlertTriangle aria-hidden className="mr-1 inline size-4 align-[-3px]" />
              {clashes.length} room{clashes.length === 1 ? " is" : "s are"} already booked at that time. They are marked below, and importing will double-book them.
            </p>
          )}

          <ul className="flex flex-col gap-4">
            {plan.companies.map((c) => (
              <li key={c.name} className="rounded-lg border border-line">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-sunk/50 px-4 py-2.5">
                  <h3 className="font-display text-[24px] font-extrabold leading-none">{c.name}</h3>
                  <p className="text-[13px] text-ink-2">
                    {c.existingId ? "Already on the schedule, new slots will be added" : "New company"}
                    {c.spocName ? `, SPOC ${c.spocName}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-3 px-4 py-3">
                  {c.slots.map((s, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <p className="tnum text-[15px] font-bold">
                        {dayLabel(new Date(s.startsAt))}, {s.when}
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {s.rooms.map((r) => (
                          <li
                            key={r.roomId}
                            title={[r.panel, r.extras.map((e) => e.label + (e.qty ? ` ×${e.qty}` : "")).join(", "), r.clash && `Clash: ${r.clash}`].filter(Boolean).join(" · ")}
                            data-status={r.clash ? "late" : undefined}
                            className={clsx(
                              "rounded-md border px-2 py-1 text-[14px]",
                              r.clash ? "border-(--tone) bg-(--tone-soft) text-(--tone-ink)" : "border-line",
                            )}
                          >
                            <span className="tnum font-display text-[17px] font-extrabold">{r.label}</span>
                            {r.panel && <span className="ml-1.5 text-ink-2">{r.panel}</span>}
                            {r.extras.length > 0 && <span className="ml-1.5 text-accent">+{r.extras.length}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
