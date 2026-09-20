"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { Plus, RotateCcw, X } from "lucide-react";
import { resetRoomChecklistAction, saveRoomChecklistAction } from "@/app/actions/admin";
import { btn, input } from "./ui";

type Item = { label: string; group: string | null; qty: number | null; note: string };
type Preset = { label: string; group: string | null; defaultQty: number | null };
const key = (i: { label: string; group: string | null }) => `${i.group ?? ""}|${i.label.toLowerCase()}`;

/** Lets the admin give one room its own list, e.g. the online room in a hybrid process. */
export function RoomChecklistEditor({ assignmentId, customized, items, presets }: { assignmentId: number; customized: boolean; items: Item[]; presets: Preset[] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const have = new Set(draft.map(key));
  const missing = presets.filter((p) => !have.has(key(p)));

  if (!editing)
    return (
      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[17px] font-bold">This room&rsquo;s list</h2>
        <p className="text-[14px] text-ink-2">
          {customized
            ? "This room has its own list. Changes to the company checklist won't reach it until you reset it."
            : "This room follows the company checklist. Give it its own list if it needs something different, like extra kit for an online panel."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className={btn.quiet}
            onClick={() => {
              setDraft(items);
              setEditing(true);
            }}
          >
            {customized ? "Edit this room's list" : "Give this room its own list"}
          </button>
          {customized && (
            <button
              className={btn.quiet}
              disabled={pending}
              onClick={() =>
                confirm("Reset this room to the company checklist? Ticks on items that stay are kept.") &&
                start(async () => {
                  const r = await resetRoomChecklistAction(assignmentId);
                  if (!r.ok) setError(r.error);
                })
              }
            >
              <RotateCcw aria-hidden className="size-4" /> Reset to company list
            </button>
          )}
        </div>
        {error && <p className="text-[14px] font-semibold text-late">{error}</p>}
      </section>
    );

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-accent bg-surface p-4">
      <h2 className="text-[17px] font-bold">Edit this room&rsquo;s list</h2>
      <ul className="flex flex-col gap-1.5">
        {draft.map((i) => (
          <li key={key(i)} className="flex items-center gap-2 rounded-lg bg-sunk px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate text-[15px]">
              {i.label}
              {i.group && <span className="text-ink-3">, {i.group}</span>}
            </span>
            <input
              aria-label={`Quantity for ${i.label}`}
              type="number"
              min={1}
              value={i.qty ?? ""}
              placeholder="qty"
              onChange={(e) =>
                setDraft((d) => d.map((x) => (key(x) === key(i) ? { ...x, qty: e.target.value ? Math.max(1, Math.floor(Number(e.target.value))) : null } : x)))
              }
              className="tnum w-16 rounded-md border border-line bg-surface px-2 py-0.5 text-[14px] outline-none focus:border-accent"
            />
            <button aria-label={`Remove ${i.label}`} onClick={() => setDraft((d) => d.filter((x) => key(x) !== key(i)))} className="rounded-md p-1 text-ink-3 hover:text-late">
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {missing.map((p) => (
            <button
              key={key(p)}
              onClick={() => setDraft((d) => [...d, { label: p.label, group: p.group, qty: p.defaultQty, note: "" }])}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-line px-2 py-1 text-[13px] font-semibold text-ink-2 hover:border-accent hover:text-accent"
            >
              <Plus aria-hidden className="size-3.5" />
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input className={clsx(input, "flex-1")} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom item for this room" aria-label="Custom item" />
        <button
          className={btn.quiet}
          onClick={() => {
            if (custom.trim() && !have.has(key({ label: custom.trim(), group: null }))) setDraft((d) => [...d, { label: custom.trim(), group: null, qty: null, note: "" }]);
            setCustom("");
          }}
        >
          Add
        </button>
      </div>
      {error && <p className="text-[14px] font-semibold text-late">{error}</p>}
      <div className="flex justify-end gap-2">
        <button className={btn.quiet} onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button
          className={btn.primary}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveRoomChecklistAction(assignmentId, draft);
              if (r.ok) setEditing(false);
              else setError(r.error);
            })
          }
        >
          {pending ? "Saving…" : "Save room list"}
        </button>
      </div>
    </section>
  );
}
