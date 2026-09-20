"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/runner";

const field =
  "block w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-[17px] text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export function LoginForm({ members }: { members: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <div>
        <label htmlFor="memberId" className="mb-1.5 block text-[15px] font-semibold">
          Your name
        </label>
        <div className="relative">
          <select id="memberId" name="memberId" defaultValue={state.memberId ?? ""} className={`${field} appearance-none pr-10`} required>
            <option value="" disabled>
              Choose your name
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 fill-ink-3">
            <path d="M5.2 7.5a.75.75 0 0 1 1.06 0L10 11.2l3.74-3.7a.75.75 0 1 1 1.06 1.06l-4.27 4.24a.75.75 0 0 1-1.06 0L5.2 8.56a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </div>
      </div>
      <div>
        <label htmlFor="roll" className="mb-1.5 block text-[15px] font-semibold">
          Roll number
        </label>
        <input
          id="roll"
          name="roll"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="For example B25031"
          className={`${field} tnum uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-3`}
          required
        />
      </div>
      {state.error && (
        <p role="alert" data-status="late" className="rounded-xl bg-(--tone-soft) px-4 py-3 text-[15px] text-(--tone-ink)">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="mt-1 rounded-xl bg-accent px-4 py-4 text-[17px] font-bold text-accent-ink transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-[14px] text-ink-3">Name missing from the list? Ask the committee admin to add you.</p>
    </form>
  );
}
