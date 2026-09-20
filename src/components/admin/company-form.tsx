"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertTriangle, Check, CopyPlus, Plus, Trash2, X } from "lucide-react";
import { saveCompanyAction } from "@/app/actions/admin";
import { dayKey, fmtRange, fromIst, hm } from "@/lib/time";
import type { Conflict } from "@/server/mutations";
import { btn, input } from "./ui";

type Mode = "offline" | "online" | "hybrid";
type Item = { label: string; group: string | null; qty: number | null; note: string };
type Preset = { id: number; label: string; group: string | null; defaultQty: number | null; modes: string[]; active: boolean };
type Building = { id: number; name: string; rooms: { id: number; number: string; floor: string; active: boolean }[] };
type Booking = { roomId: number; companyId: number; company: string; startsAt: Date; endsAt: Date };
type Slot = { key: number; id?: number; date: string; start: string; end: string; roomIds: number[] };

export type CompanyFormInitial = {
  id: number;
  name: string;
  spocName: string;
  spocPhone: string;
  mode: Mode;
  notes: string;
  items: Item[];
  slots: { id: number; startsAt: Date; endsAt: Date; roomIds: number[] }[];
};

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "offline", label: "In person", hint: "Interviews in the room" },
  { key: "online", label: "Online", hint: "Video interviews" },
  { key: "hybrid", label: "Hybrid", hint: "Both at once" },
];

const key = (i: { label: string; group: string | null }) => `${i.group ?? ""}|${i.label.toLowerCase()}`;
let nextKey = 1;

function defaultsFor(mode: Mode, presets: Preset[]): Item[] {
  return presets
    .filter((p) => p.active && p.modes.includes(mode))
    .map((p) => ({ label: p.label, group: p.group, qty: p.defaultQty, note: "" }));
}

export function CompanyForm({
  presets,
  buildings,
  bookings,
  initial,
}: {
  presets: Preset[];
  buildings: Building[];
  bookings: Booking[];
  initial?: CompanyFormInitial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [spocName, setSpocName] = useState(initial?.spocName ?? "");
  const [spocPhone, setSpocPhone] = useState(initial?.spocPhone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "offline");
  const [items, setItems] = useState<Item[]>(initial?.items ?? defaultsFor("offline", presets));
  const [slots, setSlots] = useState<Slot[]>(
    initial?.slots.map((s) => ({ key: nextKey++, id: s.id, date: dayKey(s.startsAt), start: hm(s.startsAt), end: hm(s.endsAt), roomIds: s.roomIds })) ?? [
      { key: nextKey++, date: dayKey(new Date()), start: "09:00", end: "17:00", roomIds: [] },
    ],
  );
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selected = useMemo(() => new Map(items.map((i) => [key(i), i])), [items]);
  const groups = useMemo(() => {
    const names = new Set<string | null>([null]);
    presets.forEach((p) => names.add(p.group));
    items.forEach((i) => names.add(i.group));
    return [...names];
  }, [presets, items]);

  function changeMode(m: Mode) {
    setMode(m);
    // Swap in the new mode's preset defaults, keep custom items and any quantities already typed.
    const presetKeys = new Set(presets.map(key));
    const customs = items.filter((i) => !presetKeys.has(key(i)));
    const next = defaultsFor(m, presets).map((d) => selected.get(key(d)) ?? d);
    setItems([...next, ...customs]);
  }

  function toggle(p: { label: string; group: string | null; defaultQty?: number | null }) {
    const k = key(p);
    setItems((cur) => (cur.some((i) => key(i) === k) ? cur.filter((i) => key(i) !== k) : [...cur, { label: p.label, group: p.group, qty: p.defaultQty ?? null, note: "" }]));
  }

  function setQty(k: string, qty: number | null) {
    setItems((cur) => cur.map((i) => (key(i) === k ? { ...i, qty } : i)));
  }

  function updateSlot(k: number, patch: Partial<Slot>) {
    setSlots((cur) => cur.map((s) => (s.key === k ? { ...s, ...patch } : s)));
    setConflicts(null);
  }

  function addSlot() {
    const last = slots.at(-1);
    setSlots((cur) => [...cur, { key: nextKey++, date: last?.date ?? dayKey(new Date()), start: last?.end ?? "09:00", end: "17:00", roomIds: last?.roomIds ?? [] }]);
  }

  function save(force = false) {
    setError(null);
    start(async () => {
      const r = await saveCompanyAction({
        id: initial?.id,
        name,
        spocName,
        spocPhone,
        mode,
        notes,
        items,
        force,
        slots: slots.map((s) => ({ id: s.id, startsAt: fromIst(s.date, s.start), endsAt: fromIst(s.date, s.end), roomIds: s.roomIds })),
      });
      if (!r.ok) return setError(r.error);
      if (r.data && !r.data.ok) return setConflicts(r.data.conflicts);
      if (r.data?.ok) router.push(`/admin/companies/${r.data.id}`);
    });
  }

  const customItems = items.filter((i) => !presets.some((p) => key(p) === key(i)));

  return (
    <div className="flex flex-col gap-8 pb-28">
      {/* ── Company ── */}
      <Fieldset title="Company" hint="Runners see the SPOC's name and a call button on every room.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Company name" id="name" className="md:col-span-3">
            <input id="name" className={clsx(input, "text-[17px]")} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example Northwind Analytics" />
          </Field>
          <Field label="SPOC name" id="spocName">
            <input id="spocName" className={input} value={spocName} onChange={(e) => setSpocName(e.target.value)} />
          </Field>
          <Field label="SPOC phone" id="spocPhone">
            <input id="spocPhone" type="tel" className={clsx(input, "tnum")} value={spocPhone} onChange={(e) => setSpocPhone(e.target.value)} placeholder="+91 98xxx xxxxx" />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold">Process</span>
            <div role="radiogroup" aria-label="Process" className="grid grid-cols-3 gap-1 rounded-lg bg-sunk p-1">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.key}
                  title={m.hint}
                  onClick={() => changeMode(m.key)}
                  className={clsx("rounded-md px-2 py-1.5 text-[14px] font-semibold transition", mode === m.key ? "bg-surface shadow-sm" : "text-ink-2")}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Note for runners (optional)" id="notes" className="md:col-span-3">
            <textarea id="notes" rows={2} className={input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For example: room 24 takes the online panel" />
          </Field>
        </div>
      </Fieldset>

      {/* ── Checklist ── */}
      <Fieldset
        title="Checklist for every room"
        hint={`${items.length} items selected. Switching the process picks that process's usual items. You can give a single room its own list after saving.`}
      >
        {groups.map((g) => {
          const tiles = presets.filter((p) => p.active && p.group === g);
          const customs = customItems.filter((i) => i.group === g);
          if (!tiles.length && !customs.length) return null;
          const all = [...tiles, ...customs];
          const allOn = all.every((t) => selected.has(key(t)));
          return (
            <div key={g ?? ""} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <h3 className="text-[15px] font-bold">{g ?? "In the room"}</h3>
                {g && (
                  <button
                    type="button"
                    className="text-[14px] font-semibold text-accent"
                    onClick={() =>
                      setItems((cur) =>
                        allOn
                          ? cur.filter((i) => i.group !== g)
                          : [...cur, ...tiles.filter((t) => !selected.has(key(t))).map((t) => ({ label: t.label, group: t.group, qty: t.defaultQty, note: "" }))],
                      )
                    }
                  >
                    {allOn ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {tiles.map((p) => (
                  <Tile key={p.id} label={p.label} item={selected.get(key(p))} onToggle={() => toggle(p)} onQty={(q) => setQty(key(p), q)} />
                ))}
                {customs.map((c) => (
                  <Tile key={key(c)} label={c.label} item={c} custom onToggle={() => toggle(c)} onQty={(q) => setQty(key(c), q)} />
                ))}
              </ul>
            </div>
          );
        })}
        <AddCustom groups={groups} onAdd={(i) => !selected.has(key(i)) && setItems((cur) => [...cur, i])} />
      </Fieldset>

      {/* ── Slots ── */}
      <Fieldset title="Time slots and rooms" hint="Add a slot for each day, or for when the company moves rooms.">
        {slots.map((s, idx) => (
          <SlotEditor
            key={s.key}
            index={idx}
            slot={s}
            buildings={buildings}
            bookings={bookings.filter((b) => b.companyId !== initial?.id)}
            onChange={(p) => updateSlot(s.key, p)}
            onRemove={slots.length > 1 ? () => setSlots((cur) => cur.filter((x) => x.key !== s.key)) : undefined}
          />
        ))}
        <button type="button" onClick={addSlot} className={clsx(btn.quiet, "self-start")}>
          <CopyPlus aria-hidden className="size-4" /> Add another slot
        </button>
      </Fieldset>

      {/* ── Save bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:left-[228px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 lg:px-8">
          {conflicts && (
            <div data-status="working" className="flex flex-col gap-2 rounded-lg bg-(--tone-soft) px-3 py-2.5 text-(--tone-ink) sm:flex-row sm:items-center">
              <p className="flex-1 text-[14px]">
                <AlertTriangle aria-hidden className="mr-1 inline size-4 align-[-3px]" />
                <strong>Double booking: </strong>
                {conflicts.map((c) => `${c.room} is booked by ${c.company} (${fmtRange(new Date(c.startsAt), new Date(c.endsAt))})`).join("; ")}.
              </p>
              <button type="button" onClick={() => save(true)} disabled={pending} className={btn.quiet}>
                Save anyway
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-[14px] font-semibold text-late">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="tnum hidden text-[14px] text-ink-2 sm:block">
              {slots.reduce((n, s) => n + s.roomIds.length, 0)} rooms across {slots.length} slot{slots.length === 1 ? "" : "s"}, {items.length} items each
            </p>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => router.back()} className={btn.quiet}>
                Cancel
              </button>
              <button type="button" onClick={() => save(false)} disabled={pending} className={btn.primary}>
                {pending ? "Saving…" : initial ? "Save changes" : "Schedule company"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fieldset({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 lg:p-5">
      <div>
        <h2 className="text-[19px] font-bold">{title}</h2>
        {hint && <p className="mt-0.5 text-[14px] text-ink-2">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, id, className, children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[14px] font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function Tile({ label, item, custom, onToggle, onQty }: { label: string; item?: Item; custom?: boolean; onToggle: () => void; onQty: (q: number | null) => void }) {
  const on = !!item;
  return (
    <li className={clsx("flex flex-col rounded-lg border transition", on ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-ink-3")}>
      <button type="button" aria-pressed={on} onClick={onToggle} className="flex items-center gap-2 px-3 py-2.5 text-left">
        <span className={clsx("grid size-5 shrink-0 place-items-center rounded-[5px] border-2", on ? "border-accent bg-accent text-accent-ink" : "border-ink-3/50")}>
          {on && (custom ? <X aria-hidden className="size-3.5" strokeWidth={3} /> : <Check aria-hidden className="size-3.5" strokeWidth={3.5} />)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{label}</span>
        {custom && <span className="text-[11px] font-semibold text-ink-3">custom</span>}
      </button>
      {on && (
        <label className="flex items-center gap-2 border-t border-accent/20 px-3 py-1.5 text-[13px] text-ink-2">
          Qty
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={item.qty ?? ""}
            onChange={(e) => onQty(e.target.value ? Math.max(1, Math.floor(Number(e.target.value))) : null)}
            placeholder="any"
            className="tnum w-16 rounded-md border border-line bg-surface px-2 py-0.5 text-[14px] text-ink outline-none focus:border-accent"
          />
        </label>
      )}
    </li>
  );
}

function AddCustom({ groups, onAdd }: { groups: (string | null)[]; onAdd: (i: Item) => void }) {
  const [label, setLabel] = useState("");
  const [group, setGroup] = useState("");
  const add = () => {
    if (!label.trim()) return;
    onAdd({ label: label.trim(), group: group || null, qty: null, note: "" });
    setLabel("");
  };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-line p-3 sm:flex-row sm:items-center">
      <input
        aria-label="Custom item"
        className={clsx(input, "sm:flex-1")}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        placeholder="Add a custom item, for example HDMI cable"
      />
      <select aria-label="Section" className={clsx(input, "sm:w-52")} value={group} onChange={(e) => setGroup(e.target.value)}>
        {groups.map((g) => (
          <option key={g ?? ""} value={g ?? ""}>
            {g ?? "In the room"}
          </option>
        ))}
      </select>
      <button type="button" onClick={add} className={btn.quiet}>
        <Plus aria-hidden className="size-4" /> Add
      </button>
    </div>
  );
}

/** "LC2 Floor 1: 11, 12. IC Floor 2: 201" */
function summary(buildings: Building[], roomIds: number[]) {
  const parts: string[] = [];
  for (const b of buildings)
    for (const f of new Set(b.rooms.map((r) => r.floor))) {
      const nums = b.rooms.filter((r) => r.floor === f && roomIds.includes(r.id)).map((r) => r.number);
      if (nums.length) parts.push(`${b.name}${f ? ` ${f}` : ""}: ${nums.join(", ")}`);
    }
  return parts.join(". ");
}

function SlotEditor({
  index,
  slot,
  buildings,
  bookings,
  onChange,
  onRemove,
}: {
  index: number;
  slot: Slot;
  buildings: Building[];
  bookings: Booking[];
  onChange: (p: Partial<Slot>) => void;
  onRemove?: () => void;
}) {
  const startsAt = fromIst(slot.date, slot.start);
  const endsAt = fromIst(slot.date, slot.end);
  const valid = endsAt > startsAt;
  const clash = new Map<number, Booking>();
  if (valid) for (const b of bookings) if (b.startsAt < endsAt && b.endsAt > startsAt) clash.set(b.roomId, b);
  const toggle = (id: number) => onChange({ roomIds: slot.roomIds.includes(id) ? slot.roomIds.filter((r) => r !== id) : [...slot.roomIds, id] });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line p-3.5">
      <div className="flex flex-wrap items-end gap-3">
        <span className="font-display text-[22px] font-extrabold leading-none">Slot {index + 1}</span>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Date
          <input type="date" className={clsx(input, "tnum w-auto")} value={slot.date} onChange={(e) => onChange({ date: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          From
          <input type="time" className={clsx(input, "tnum w-auto")} value={slot.start} onChange={(e) => onChange({ start: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          To
          <input type="time" className={clsx(input, "tnum w-auto")} value={slot.end} onChange={(e) => onChange({ end: e.target.value })} />
        </label>
        {onRemove && (
          <button type="button" onClick={onRemove} className={clsx(btn.danger, "ml-auto")}>
            <Trash2 aria-hidden className="size-4" /> Remove slot
          </button>
        )}
      </div>
      {!valid && <p className="text-[14px] font-semibold text-late">The end time must be after the start time.</p>}
      {buildings.map((b) => {
        const floors = [...new Set(b.rooms.map((r) => r.floor))];
        const picked = b.rooms.filter((r) => slot.roomIds.includes(r.id)).length;
        return (
          <div key={b.id} className="flex flex-col gap-2 rounded-lg bg-sunk/50 p-3">
            <h4 className="flex items-baseline gap-2">
              <span className="font-display text-[22px] font-extrabold leading-none">{b.name}</span>
              <span className="text-[13px] text-ink-3">{picked ? `${picked} selected` : "none selected"}</span>
            </h4>
            {floors.map((f) => (
              <div key={f} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <span className="shrink-0 text-[13px] font-bold text-ink-2 sm:w-24">{f || "No floor"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {b.rooms
                    .filter((r) => r.floor === f)
                    .map((r) => {
                      const on = slot.roomIds.includes(r.id);
                      const c = clash.get(r.id);
                      const full = `${b.name}, ${f || "no floor"}, room ${r.number}`;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          aria-pressed={on}
                          aria-label={full}
                          onClick={() => toggle(r.id)}
                          title={c ? `${full}. Booked by ${c.company}, ${fmtRange(c.startsAt, c.endsAt)}` : full}
                          className={clsx(
                            "tnum relative h-10 min-w-12 rounded-md border px-2 font-display text-[19px] font-extrabold transition",
                            on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-ink-3",
                            c && !on && "border-dashed text-ink-3",
                            c && on && "ring-2 ring-pending ring-offset-1 ring-offset-surface",
                          )}
                        >
                          {r.number}
                          {c && <span aria-hidden className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-surface bg-pending" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <p className="text-[14px]">
        <span className="font-semibold">Selected: </span>
        {summary(buildings, slot.roomIds) || <span className="text-ink-3">no rooms yet. Tap room numbers above.</span>}
      </p>
      {slot.roomIds.some((id) => clash.has(id)) && (
        <p className="text-[13px] text-pending-ink">
          <AlertTriangle aria-hidden className="mr-1 inline size-4 align-[-3px]" />
          Rooms with an amber dot are already booked at this time. Hover a room to see by whom.
        </p>
      )}
    </div>
  );
}
