"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import * as A from "@/app/actions/admin";
import type { BuildingWithRooms } from "@/server/admin-data";
import { btn, input } from "./ui";

type Result = { ok: boolean; error?: string };

function useRunner() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else after?.();
    });
  return { error, pending, run };
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 lg:p-5">
      <div>
        <h2 className="text-[20px] font-bold">{title}</h2>
        {hint && <p className="mt-0.5 text-[14px] text-ink-2">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const Err = ({ error }: { error: string | null }) =>
  error ? (
    <p role="alert" className="text-[14px] font-semibold text-late">
      {error}
    </p>
  ) : null;

/* ── Buildings & rooms ── */

type Room = BuildingWithRooms["rooms"][number];
const floorsOf = (b?: BuildingWithRooms) => (b ? [...new Set(b.rooms.map((r) => r.floor))] : []);

export function BuildingsManager({ buildings }: { buildings: BuildingWithRooms[] }) {
  const { error, pending, run } = useRunner();
  const [editing, setEditing] = useState<number | null>(null);
  const [newBuilding, setNewBuilding] = useState("");
  const total = buildings.reduce((n, b) => n + b.rooms.length, 0);

  return (
    <Card
      title="Buildings and rooms"
      hint={`${buildings.length} buildings, ${total} rooms. Every room belongs to a building and a floor. Tap a room to rename it, move it, or switch it off.`}
    >
      <AddRooms buildings={buildings} />
      <Err error={error} />
      {buildings.map((b) => (
        <div key={b.id} className="flex flex-col gap-3 rounded-lg border border-line p-3.5">
          <div className="flex items-center justify-between gap-2">
            <InlineName
              value={b.name}
              label="building name"
              className="font-display text-[28px] font-extrabold leading-none"
              onSave={(name) => run(() => A.updateBuildingAction(b.id, { name }))}
            />
            <span className="flex items-center gap-1">
              <span className="tnum text-[13px] text-ink-3">
                {b.rooms.length} room{b.rooms.length === 1 ? "" : "s"}
              </span>
              <button
                className="rounded-md p-2 text-ink-3 hover:bg-late-soft hover:text-late"
                aria-label={`Delete ${b.name}`}
                onClick={() => confirm(`Delete ${b.name} and all its rooms?`) && run(() => A.deleteBuildingAction(b.id))}
              >
                <Trash2 className="size-4" />
              </button>
            </span>
          </div>
          {b.rooms.length === 0 && <p className="text-[14px] text-ink-3">No rooms yet. Add some with the form above.</p>}
          {floorsOf(b).map((f) => {
            const rooms = b.rooms.filter((r) => r.floor === f);
            const open = rooms.find((r) => r.id === editing);
            return (
              <div key={f} className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <InlineName
                    value={f}
                    label={`floor name in ${b.name}`}
                    placeholder="No floor"
                    className="w-28 shrink-0 text-[14px] font-bold text-ink-2"
                    onSave={(to) => run(() => A.renameFloorAction({ buildingId: b.id, from: f, to }))}
                  />
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      aria-pressed={editing === r.id}
                      title={`${b.name}, ${f || "no floor"}, room ${r.number}${r.active ? "" : " (inactive)"}`}
                      onClick={() => setEditing(editing === r.id ? null : r.id)}
                      className={clsx(
                        "tnum h-9 min-w-11 rounded-md border px-2 font-display text-[18px] font-extrabold transition",
                        editing === r.id
                          ? "border-accent bg-accent text-accent-ink"
                          : r.active
                            ? "border-line bg-surface hover:border-ink-3"
                            : "border-dashed border-line bg-sunk text-ink-3 line-through",
                      )}
                    >
                      {r.number}
                    </button>
                  ))}
                </div>
                {open && <RoomEditor key={open.id} room={open} building={b} buildings={buildings} onDone={() => setEditing(null)} />}
              </div>
            );
          })}
        </div>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => A.createBuildingAction({ name: newBuilding, sort: buildings.length }), () => setNewBuilding(""));
        }}
      >
        <input className={clsx(input, "max-w-xs")} placeholder="New building name" value={newBuilding} onChange={(e) => setNewBuilding(e.target.value)} aria-label="New building name" />
        <button className={btn.quiet} disabled={pending || !newBuilding.trim()}>
          <Plus aria-hidden className="size-4" /> Add building
        </button>
      </form>
    </Card>
  );
}

/** Building, then floor, then room numbers. Floors are created simply by naming them here. */
function AddRooms({ buildings }: { buildings: BuildingWithRooms[] }) {
  const { error, pending, run } = useRunner();
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? 0);
  const [floor, setFloor] = useState("");
  const [numbers, setNumbers] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const building = buildings.find((b) => b.id === buildingId);
  if (!buildings.length) return null;

  return (
    <form
      className="flex flex-col gap-3 rounded-lg bg-sunk/60 p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        setNote(null);
        run(async () => {
          const r = await A.createRoomsAction({ buildingId, floor, numbers });
          if (r.ok && r.data) {
            const { created, skipped } = r.data;
            setNote(
              [created.length ? `Added ${created.map((c) => c.number).join(", ")}.` : "", skipped.length ? `Skipped ${skipped.join(", ")} (already in ${building?.name}).` : ""]
                .filter(Boolean)
                .join(" "),
            );
            setNumbers("");
          }
          return r;
        });
      }}
    >
      <h3 className="text-[15px] font-bold">Add rooms</h3>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Building
          <select className={input} value={buildingId} onChange={(e) => setBuildingId(Number(e.target.value))}>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Floor
          <input className={input} list="add-floor-options" placeholder="Pick or type, e.g. Floor 4" value={floor} onChange={(e) => setFloor(e.target.value)} />
          <datalist id="add-floor-options">
            {floorsOf(building).map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Room numbers
          <input className={clsx(input, "tnum")} placeholder="41-46, or 50, 52" value={numbers} onChange={(e) => setNumbers(e.target.value)} />
        </label>
        <button className={btn.primary} disabled={pending || !numbers.trim() || !buildingId}>
          <Plus aria-hidden className="size-4" /> Add rooms
        </button>
      </div>
      {note && <p className="text-[14px] font-semibold text-ready">{note}</p>}
      <Err error={error} />
    </form>
  );
}

function RoomEditor({ room, building, buildings, onDone }: { room: Room; building: BuildingWithRooms; buildings: BuildingWithRooms[]; onDone: () => void }) {
  const { error, pending, run } = useRunner();
  const [number, setNumber] = useState(room.number);
  const [buildingId, setBuildingId] = useState(building.id);
  const [floor, setFloor] = useState(room.floor);
  const [active, setActive] = useState(room.active);
  const target = buildings.find((b) => b.id === buildingId);
  const listId = `floor-options-${room.id}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-soft/40 p-3">
      <p className="text-[14px] font-bold">
        Room {room.number}, {building.name}
        {room.floor ? `, ${room.floor}` : ""}
      </p>
      <div className="grid gap-2 sm:grid-cols-4 sm:items-end">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Number
          <input className={clsx(input, "tnum")} value={number} onChange={(e) => setNumber(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Building
          <select className={input} value={buildingId} onChange={(e) => setBuildingId(Number(e.target.value))}>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Floor
          <input className={input} list={listId} value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Pick or type" />
          <datalist id={listId}>
            {floorsOf(target).map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <label className="flex items-center gap-2 pb-2 text-[14px] font-semibold">
          <input type="checkbox" className="size-4 accent-(--accent)" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Available for new schedules
        </label>
      </div>
      <Err error={error} />
      <div className="flex flex-wrap justify-between gap-2">
        <button
          className={btn.danger}
          disabled={pending}
          onClick={() => confirm(`Delete room ${room.number}?`) && run(() => A.deleteRoomAction(room.id), onDone)}
        >
          <Trash2 aria-hidden className="size-4" /> Delete room
        </button>
        <span className="flex gap-2">
          <button className={btn.quiet} onClick={onDone}>
            Cancel
          </button>
          <button className={btn.primary} disabled={pending || !number.trim()} onClick={() => run(() => A.updateRoomAction(room.id, { number, buildingId, floor, active }), onDone)}>
            {pending ? "Saving…" : "Save room"}
          </button>
        </span>
      </div>
    </div>
  );
}

/** Text that turns into an input when you click the pencil. */
function InlineName({
  value,
  label,
  className,
  placeholder,
  onSave,
}: {
  value: string;
  label: string;
  className?: string;
  placeholder?: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing)
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
          setEditing(false);
        }}
      >
        <input autoFocus aria-label={`New ${label}`} className={clsx(input, "w-40 py-1")} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className={clsx(btn.primary, "px-2.5 py-1 text-[13px]")}>Save</button>
        <button type="button" className="rounded-md p-1 text-ink-3" aria-label="Cancel" onClick={() => setEditing(false)}>
          <X className="size-4" />
        </button>
      </form>
    );
  return (
    <span className={clsx("group inline-flex items-center gap-1", className)}>
      <span className={clsx(!value && "font-normal italic text-ink-3")}>{value || placeholder}</span>
      <button
        aria-label={`Rename ${label}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="rounded-md p-1 font-sans text-ink-3 opacity-60 hover:bg-sunk hover:text-ink group-hover:opacity-100"
      >
        <Pencil className="size-3.5" />
      </button>
    </span>
  );
}

/* ── Checklist presets ── */

type Preset = { id: number; label: string; group: string | null; defaultQty: number | null; modes: string[]; active: boolean; sort: number };
const MODES = [
  { key: "offline", label: "In person" },
  { key: "online", label: "Online" },
  { key: "hybrid", label: "Hybrid" },
] as const;

export function PresetsManager({ presets }: { presets: Preset[] }) {
  const { error, pending, run } = useRunner();
  const [label, setLabel] = useState("");
  const [group, setGroup] = useState("");
  const groups = [...new Set(presets.map((p) => p.group))].sort((a, b) => Number(a !== null) - Number(b !== null));
  const namedGroups = groups.filter((g): g is string => !!g);

  return (
    <Card
      title="Checklist tiles"
      hint="These are the tiles you pick from when scheduling. Ticked modes are selected automatically when you choose that process."
    >
      <Err error={error} />
      {groups.map((g) => (
        <div key={g ?? ""} className="flex flex-col gap-2">
          <h3 className="text-[15px] font-bold">{g ?? "In the room"}</h3>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[620px] text-[14px]">
              <thead className="bg-sunk/60 text-left text-[12px] text-ink-3">
                <tr>
                  <th className="px-3 py-2 font-semibold">Item</th>
                  <th className="px-3 py-2 font-semibold">Default qty</th>
                  {MODES.map((m) => (
                    <th key={m.key} className="px-2 py-2 text-center font-semibold">
                      {m.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold">Shown</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {presets
                  .filter((p) => p.group === g)
                  .map((p) => (
                    <tr key={p.id} className={clsx(!p.active && "text-ink-3")}>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 font-semibold outline-none hover:border-line focus:border-accent"
                          defaultValue={p.label}
                          aria-label="Item name"
                          onBlur={(e) => e.target.value.trim() && e.target.value !== p.label && run(() => A.updatePresetAction(p.id, { label: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          min={1}
                          className="tnum w-20 rounded-md border border-line bg-surface px-2 py-1 outline-none focus:border-accent"
                          defaultValue={p.defaultQty ?? ""}
                          placeholder="any"
                          aria-label={`Default quantity for ${p.label}`}
                          onBlur={(e) => {
                            const v = e.target.value ? Math.max(1, Math.floor(Number(e.target.value))) : null;
                            if (v !== p.defaultQty) run(() => A.updatePresetAction(p.id, { defaultQty: v }));
                          }}
                        />
                      </td>
                      {MODES.map((m) => (
                        <td key={m.key} className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-(--accent)"
                            aria-label={`${p.label} selected for ${m.label}`}
                            checked={p.modes.includes(m.key)}
                            disabled={pending}
                            onChange={(e) =>
                              run(() => A.updatePresetAction(p.id, { modes: e.target.checked ? [...p.modes, m.key] : p.modes.filter((x) => x !== m.key) }))
                            }
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-(--accent)"
                          aria-label={`Show ${p.label} as a tile`}
                          checked={p.active}
                          disabled={pending}
                          onChange={(e) => run(() => A.updatePresetAction(p.id, { active: e.target.checked }))}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          aria-label={`Delete ${p.label}`}
                          className="rounded-md p-1.5 text-ink-3 hover:bg-late-soft hover:text-late"
                          onClick={() => confirm(`Delete the ${p.label} tile? Existing schedules keep it.`) && run(() => A.deletePresetAction(p.id))}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <form
        className="flex flex-col gap-2 rounded-lg border border-dashed border-line p-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => A.createPresetAction({ label, group: group || null, modes: ["offline", "online", "hybrid"], sort: presets.length }), () => setLabel(""));
        }}
      >
        <input className={clsx(input, "sm:flex-1")} placeholder="New tile, e.g. Extension board" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="New tile name" />
        <input className={clsx(input, "sm:w-56")} list="preset-groups" placeholder="Section (blank = in the room)" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Section" />
        <datalist id="preset-groups">
          {namedGroups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <button className={btn.quiet} disabled={pending || !label.trim()}>
          <Plus aria-hidden className="size-4" /> Add tile
        </button>
      </form>
    </Card>
  );
}

/* ── Settings ── */

export function SettingsForm({ lateMinutes }: { lateMinutes: number }) {
  const { error, pending, run } = useRunner();
  const [value, setValue] = useState(String(lateMinutes));
  const [saved, setSaved] = useState(false);
  return (
    <Card title="Red alert timing" hint="A room turns red if it isn't marked ready this many minutes before its slot starts.">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          run(() => A.setLateMinutesAction(Math.floor(Number(value))), () => setSaved(true));
        }}
      >
        <input type="number" min={0} max={1440} className={clsx(input, "tnum w-24")} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Minutes before start" />
        <span className="text-[15px] text-ink-2">minutes before start</span>
        <button className={btn.primary} disabled={pending}>
          Save
        </button>
        {saved && <span className="text-[14px] font-semibold text-ready">Saved</span>}
      </form>
      <Err error={error} />
    </Card>
  );
}
