"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { createMemberAction, deleteMemberAction, updateMemberAction } from "@/app/actions/admin";
import { btn, input } from "./ui";

type Member = { id: number; name: string; rollNumber: string; active: boolean };

export function MembersManager({ members }: { members: Member[] }) {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = members.filter((m) => `${m.name} ${m.rollNumber}`.toLowerCase().includes(q.trim().toLowerCase()));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else after?.();
    });

  return (
    <div className="flex flex-col gap-5">
      <AddMember onAdd={(name, rollNumber, reset) => run(() => createMemberAction({ name, rollNumber }), reset)} pending={pending} />
      <BulkAdd onAdd={(rows, reset) => run(async () => {
        for (const [name, rollNumber] of rows) {
          const r = await createMemberAction({ name, rollNumber });
          if (!r.ok) return r;
        }
        return { ok: true };
      }, reset)} />
      {error && (
        <p role="alert" className="text-[14px] font-semibold text-late">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <input className={clsx(input, "max-w-xs")} placeholder="Search by name or roll number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
        <p className="tnum text-[14px] text-ink-3">
          {members.filter((m) => m.active).length} active of {members.length}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[560px] text-left text-[15px]">
          <thead className="border-b border-line text-[13px] text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Roll number (login PIN)</th>
              <th className="px-4 py-2.5 font-semibold">Can sign in</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((m) => (
              <MemberRow key={m.id} m={m} pending={pending} run={run} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberRow({ m, pending, run }: { m: Member; pending: boolean; run: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(m.name);
  const [roll, setRoll] = useState(m.rollNumber);
  if (edit)
    return (
      <tr className="bg-accent-soft/40">
        <td className="px-3 py-2">
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
        </td>
        <td className="px-3 py-2">
          <input className={clsx(input, "tnum uppercase")} value={roll} onChange={(e) => setRoll(e.target.value)} aria-label="Roll number" />
        </td>
        <td />
        <td className="whitespace-nowrap px-3 py-2 text-right">
          <button className={btn.quiet} onClick={() => setEdit(false)}>
            Cancel
          </button>{" "}
          <button className={btn.primary} disabled={pending} onClick={() => run(() => updateMemberAction(m.id, { name, rollNumber: roll }), () => setEdit(false))}>
            Save
          </button>
        </td>
      </tr>
    );
  return (
    <tr className={clsx(!m.active && "text-ink-3")}>
      <td className="px-4 py-2.5 font-semibold">{m.name}</td>
      <td className="tnum px-4 py-2.5">{m.rollNumber}</td>
      <td className="px-4 py-2.5">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="size-4 accent-(--accent)" checked={m.active} disabled={pending} onChange={(e) => run(() => updateMemberAction(m.id, { active: e.target.checked }))} />
          {m.active ? "Yes" : "No"}
        </label>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        <button aria-label={`Edit ${m.name}`} className="rounded-md p-2 text-ink-3 hover:bg-sunk hover:text-ink" onClick={() => setEdit(true)}>
          <Pencil className="size-4" />
        </button>
        <button
          aria-label={`Remove ${m.name}`}
          className="rounded-md p-2 text-ink-3 hover:bg-late-soft hover:text-late"
          onClick={() => confirm(`Remove ${m.name}? Their past ticks stay in the log. To stop sign-in but keep them listed, untick "Can sign in" instead.`) && run(() => deleteMemberAction(m.id))}
        >
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}

function AddMember({ onAdd, pending }: { onAdd: (name: string, roll: string, reset: () => void) => void; pending: boolean }) {
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(name, roll, () => {
          setName("");
          setRoll("");
        });
      }}
    >
      <label className="flex flex-1 flex-col gap-1 text-[14px] font-semibold">
        Name
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-[14px] font-semibold sm:w-48">
        Roll number
        <input className={clsx(input, "tnum uppercase")} value={roll} onChange={(e) => setRoll(e.target.value)} required />
      </label>
      <button className={btn.primary} disabled={pending}>
        <UserPlus aria-hidden className="size-4" /> Add member
      </button>
    </form>
  );
}

function BulkAdd({ onAdd }: { onAdd: (rows: [string, string][], reset: () => void) => void }) {
  const [text, setText] = useState("");
  const rows = text
    .split("\n")
    .map((l) => l.split(/\t|,/).map((x) => x.trim()))
    .filter((p): p is [string, string] => p.length >= 2 && !!p[0] && !!p[1] && !/^name$/i.test(p[0]));
  return (
    <details className="rounded-xl border border-line bg-surface">
      <summary className="px-4 py-3 text-[15px] font-semibold">Add many at once</summary>
      <div className="flex flex-col gap-2 border-t border-line p-4">
        <p className="text-[14px] text-ink-2">Paste one member per line as name, then a tab or comma, then roll number. Copying two columns from a spreadsheet works.</p>
        <textarea rows={5} className={clsx(input, "tnum")} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Asha Rao\tB25500\nKiran Das\tH25120"} />
        <button className={clsx(btn.quiet, "self-start")} disabled={!rows.length} onClick={() => onAdd(rows, () => setText(""))}>
          Add {rows.length || ""} member{rows.length === 1 ? "" : "s"}
        </button>
      </div>
    </details>
  );
}
