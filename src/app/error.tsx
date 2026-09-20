"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

/** Shown when a page fails to load, e.g. the database is briefly unreachable. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div data-status="late" className="plate px-5 pb-5 pt-7">
        <h1 className="font-display text-[40px] font-extrabold leading-none tracking-tight">This page didn&rsquo;t load</h1>
        <p className="mt-2 text-[16px] leading-snug">
          The app couldn&rsquo;t reach the database just now. Your ticks are saved. Try again in a moment.
        </p>
      </div>
      <button onClick={reset} className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-4 text-[17px] font-bold text-accent-ink">
        <RotateCw aria-hidden className="size-5" /> Try again
      </button>
      <p className="text-center text-[14px] text-ink-3">
        Still stuck? Tell the admin{error.digest ? `, and mention code ${error.digest}` : ""}.
      </p>
    </main>
  );
}
