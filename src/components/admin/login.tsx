"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions/admin";

export function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, {});
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div data-status="over" className="plate px-6 pb-6 pt-8">
        <p className="text-[15px] font-semibold opacity-80">Scheduler</p>
        <h1 className="font-display text-[52px] font-extrabold leading-[0.9] tracking-tight">Room Checker admin</h1>
      </div>
      <form action={action} className="mt-8 flex flex-col gap-4">
        <label htmlFor="password" className="text-[15px] font-semibold">
          Admin password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-xl border border-line bg-surface px-4 py-3.5 text-[17px] outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
        />
        {state.error && (
          <p role="alert" className="text-[15px] font-semibold text-late">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="rounded-xl bg-accent px-4 py-3.5 text-[17px] font-bold text-accent-ink disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
