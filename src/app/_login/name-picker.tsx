"use client";

import { useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, ChevronDown, X } from "lucide-react";

type Member = { id: number; name: string };

/** Type-to-filter name picker: "pra" narrows the list to matching names. */
export function NamePicker({ members, defaultId, inputClass }: { members: Member[]; defaultId?: string; inputClass: string }) {
  const initial = members.find((m) => String(m.id) === defaultId);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [picked, setPicked] = useState<Member | null>(initial ?? null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || picked?.name.toLowerCase() === q) return members;
    // Match anywhere in the name, so "pra" finds Prabhat and Prakrati.
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [query, members, picked]);

  function choose(m: Member) {
    setPicked(m);
    setQuery(m.name);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return Math.max(0, Math.min(matches.length - 1, next));
      });
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name="memberId" value={picked ? String(picked.id) : ""} />
      <input
        id="memberName"
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={clsx(inputClass, "pr-11")}
        placeholder="Start typing your name"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPicked(null);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={query ? "Clear name" : "Show all names"}
        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-3"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (query) {
            setQuery("");
            setPicked(null);
          }
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {query ? <X className="size-5" /> : <ChevronDown className="size-5" />}
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface py-1 shadow-xl shadow-black/15"
        >
          {matches.length === 0 && <li className="px-4 py-3 text-[15px] text-ink-3">No name matches “{query.trim()}”. Check the spelling, or ask the admin to add you.</li>}
          {matches.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={picked?.id === m.id}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(m)}
                className={clsx(
                  "flex w-full items-center gap-2 px-4 py-3 text-left text-[16px]",
                  i === active && "bg-accent-soft",
                  picked?.id === m.id && "font-bold",
                )}
              >
                <Check aria-hidden className={clsx("size-4 shrink-0", picked?.id === m.id ? "opacity-100 text-accent" : "opacity-0")} />
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
