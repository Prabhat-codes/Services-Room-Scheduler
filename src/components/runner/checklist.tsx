"use client";

import { useOptimistic, useState, useTransition } from "react";
import { clsx } from "clsx";
import { Check, ChevronDown, PartyPopper } from "lucide-react";
import { markReady, toggleTask, toggleTasks } from "@/app/actions/runner";
import { fmtTime } from "@/lib/time";

type Task = {
  id: number;
  label: string;
  group: string | null;
  qty: number | null;
  note: string;
  doneAt: string | null;
  doneBy: string | null;
};

type State = { tasks: Task[]; readyAt: string | null; readyBy: string | null };
type Change = { kind: "tick"; ids: number[]; done: boolean; by: string } | { kind: "ready"; by: string };

function reduce(state: State, c: Change): State {
  if (c.kind === "ready") return { ...state, readyAt: new Date().toISOString(), readyBy: c.by };
  const ids = new Set(c.ids);
  const stamp = new Date().toISOString();
  return {
    tasks: state.tasks.map((t) => (ids.has(t.id) ? { ...t, doneAt: c.done ? stamp : null, doneBy: c.done ? c.by : null } : t)),
    // Unticking anything re-opens a ready room.
    readyAt: c.done ? state.readyAt : null,
    readyBy: c.done ? state.readyBy : null,
  };
}

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {}
};

export function Checklist(props: { assignmentId: number; tasks: Task[]; readyAt: string | null; readyBy: string | null; over: boolean; me: string }) {
  const [state, apply] = useOptimistic<State, Change>({ tasks: props.tasks, readyAt: props.readyAt, readyBy: props.readyBy }, reduce);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = state.tasks.length;
  const ticked = state.tasks.filter((t) => t.doneAt).length;
  const left = total - ticked;
  const ready = !!state.readyAt;

  function tick(ids: number[], done: boolean) {
    buzz();
    setError(null);
    startTransition(async () => {
      apply({ kind: "tick", ids, done, by: props.me });
      const r = ids.length === 1 ? await toggleTask(ids[0], done) : await toggleTasks(ids, done);
      if (!r.ok) setError(r.error);
    });
  }

  function allDone() {
    buzz();
    setError(null);
    startTransition(async () => {
      apply({ kind: "ready", by: props.me });
      const r = await markReady(props.assignmentId);
      if (!r.ok) setError(r.error);
    });
  }

  const sections = groupTasks(state.tasks);

  return (
    <>
      <section aria-labelledby="checklist-title" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 id="checklist-title" className="text-[20px] font-bold">
            Checklist
          </h2>
          <span className="tnum text-[15px] text-ink-2">
            {ticked} of {total} ticked
          </span>
        </div>
        {total === 0 && <p className="text-[15px] text-ink-3">The admin hasn&rsquo;t added any items for this room yet.</p>}
        {sections.map((sec) => (
          <TaskGroup key={sec.name ?? ""} name={sec.name} tasks={sec.tasks} disabled={props.over} onTick={tick} />
        ))}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl flex-col gap-2.5 px-4">
          {error && (
            <p role="alert" data-status="late" className="rounded-lg bg-(--tone-soft) px-3 py-2 text-[14px] font-semibold text-(--tone-ink)">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div
              data-status={ready ? "ready" : "working"}
              className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tone)_18%,transparent)]"
              role="progressbar"
              aria-label="Checklist progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={ticked}
            >
              <div className="h-full rounded-full bg-(--tone) transition-[width] duration-300" style={{ width: `${total ? (ticked / total) * 100 : 0}%` }} />
            </div>
            <span className="tnum text-[14px] font-semibold text-ink-2">
              {ticked}/{total}
            </span>
          </div>
          {props.over ? (
            <p className="rounded-xl bg-sunk px-4 py-3.5 text-center text-[16px] font-semibold text-ink-2">This slot has finished.</p>
          ) : ready ? (
            <div data-status="ready" className="flex items-center gap-3 rounded-xl bg-(--tone-soft) px-4 py-3 text-(--tone-ink)">
              <PartyPopper aria-hidden className="size-6 shrink-0" />
              <p className="text-[15px] leading-snug">
                <span className="block text-[17px] font-bold">Room is ready</span>
                Marked by {state.readyBy?.split(" ")[0] ?? "a runner"}
                {state.readyAt ? ` at ${fmtTime(new Date(state.readyAt))}` : ""}. Untick an item if something goes missing.
              </p>
            </div>
          ) : (
            <button
              onClick={allDone}
              disabled={left > 0 || pending || total === 0}
              className={clsx(
                "rounded-xl px-4 py-4 text-[18px] font-bold transition",
                left === 0 && total > 0 ? "bg-ready text-white active:scale-[0.99] dark:text-ready-soft" : "bg-sunk text-ink-3",
              )}
            >
              {left === 0 && total > 0 ? "All done, room is ready" : `All done (${left} item${left === 1 ? "" : "s"} left)`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function groupTasks(tasks: Task[]) {
  const out: { name: string | null; tasks: Task[] }[] = [];
  for (const t of tasks) {
    let sec = out.find((s) => s.name === t.group);
    if (!sec) out.push((sec = { name: t.group, tasks: [] }));
    sec.tasks.push(t);
  }
  // Loose room items first, bundles (like the recruiter's tray) after.
  return out.sort((a, b) => Number(a.name !== null) - Number(b.name !== null));
}

function TaskGroup({ name, tasks, disabled, onTick }: { name: string | null; tasks: Task[]; disabled: boolean; onTick: (ids: number[], done: boolean) => void }) {
  const done = tasks.filter((t) => t.doneAt).length;
  const complete = done === tasks.length;
  const [open, setOpen] = useState(!complete || !name);
  const list = (
    <ul className="divide-y divide-line">
      {tasks.map((t) => (
        <TaskRow key={t.id} t={t} disabled={disabled} onTick={onTick} />
      ))}
    </ul>
  );

  if (!name) return <div className="overflow-hidden rounded-2xl border border-line bg-surface">{list}</div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 bg-sunk/60 pr-2">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-14 flex-1 items-center gap-2 px-4 text-left">
          <ChevronDown aria-hidden className={clsx("size-5 text-ink-3 transition", !open && "-rotate-90")} />
          <span className="text-[17px] font-bold">{name}</span>
          <span data-status={complete ? "ready" : "working"} className="tnum ml-1 rounded-full bg-(--tone-soft) px-2 text-[13px] font-bold text-(--tone-ink)">
            {done}/{tasks.length}
          </span>
        </button>
        {!disabled && (
          <button
            onClick={() => onTick(tasks.filter((t) => !!t.doneAt === complete).map((t) => t.id), !complete)}
            className="rounded-lg px-3 py-2 text-[14px] font-semibold text-accent"
          >
            {complete ? "Untick all" : "Tick all"}
          </button>
        )}
      </div>
      {open && list}
    </div>
  );
}

function TaskRow({ t, disabled, onTick }: { t: Task; disabled: boolean; onTick: (ids: number[], done: boolean) => void }) {
  const done = !!t.doneAt;
  return (
    <li>
      <button
        role="checkbox"
        aria-checked={done}
        disabled={disabled}
        onClick={() => onTick([t.id], !done)}
        className="flex min-h-15 w-full items-center gap-3.5 px-4 py-3 text-left transition active:bg-sunk disabled:opacity-70"
      >
        <span
          aria-hidden
          className={clsx(
            "grid size-7 shrink-0 place-items-center rounded-lg border-2 transition-colors",
            done ? "border-ready bg-ready text-white dark:text-ready-soft" : "border-ink-3/60 bg-surface",
          )}
        >
          {done && <Check className="animate-pop size-5" strokeWidth={3.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={clsx("block text-[17px] leading-snug", done ? "text-ink-2" : "font-semibold")}>{t.label}</span>
          {(t.note || (done && t.doneBy)) && (
            <span className="block text-[13px] leading-snug text-ink-3">
              {t.note}
              {t.note && done && t.doneBy ? ". " : ""}
              {done && t.doneBy ? `${t.doneBy.split(" ")[0]}, ${fmtTime(new Date(t.doneAt!))}` : ""}
            </span>
          )}
        </span>
        {t.qty && (
          <span className="tnum shrink-0 rounded-md bg-sunk px-2 py-0.5 text-[15px] font-bold text-ink-2">×{t.qty}</span>
        )}
      </button>
    </li>
  );
}
