"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, type LoginState } from "@/app/actions/runner";
import { NamePicker } from "./name-picker";

const field =
  "block w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-[17px] text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export function LoginForm({ members }: { members: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <div>
        <label htmlFor="memberName" className="mb-1.5 block text-[15px] font-semibold">
          Your name
        </label>
        <NamePicker members={members} defaultId={state.memberId} inputClass={field} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[15px] font-semibold">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="roll"
            type={show ? "text" : "password"}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={`${field} pr-12`}
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-ink-3"
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
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
      <p className="text-center text-[14px] text-ink-3">Name missing, or password not working? Ask the committee admin.</p>
    </form>
  );
}
