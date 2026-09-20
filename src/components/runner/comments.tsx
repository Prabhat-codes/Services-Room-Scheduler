"use client";

import { useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { ResolveButton } from "@/components/admin/resolve-button";
import type { ActionResult } from "@/server/result";
import { dayLabel, fmtTime } from "@/lib/time";

type C = { id: number; author: string; body: string; at: string; resolved: boolean; byAdmin?: boolean };

export function Comments({
  assignmentId,
  comments,
  post,
  admin,
}: {
  assignmentId: number;
  comments: C[];
  post: (assignmentId: number, body: string) => Promise<ActionResult<unknown>>;
  admin?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value.trim() ?? "";
    if (!body) return setError("Write something first.");
    setError(null);
    startTransition(async () => {
      const r = await post(assignmentId, body);
      if (r.ok) {
        if (ref.current) ref.current.value = "";
      } else setError(r.error);
    });
  }

  return (
    <section aria-labelledby="comments-title" className="flex flex-col gap-3">
      <h2 id="comments-title" className="text-[20px] font-bold">
        Issues and comments
      </h2>
      {comments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {comments.map((c) => (
            <li
              key={c.id}
              data-status={c.byAdmin ? "ready" : c.resolved ? "over" : "late"}
              className={clsx("flex items-start gap-3 rounded-xl border-l-4 border-(--tone) bg-surface px-4 py-3", c.resolved && !c.byAdmin && "opacity-70")}
            >
              <div className="min-w-0 flex-1">
              <p className="whitespace-pre-line text-[16px] leading-snug">{c.body}</p>
              <p className="mt-1 text-[13px] text-ink-3">
                {c.author}, {dayLabel(new Date(c.at)).toLowerCase() === "today" ? fmtTime(new Date(c.at)) : `${dayLabel(new Date(c.at))} ${fmtTime(new Date(c.at))}`}
                {c.resolved && !c.byAdmin && <span className="font-semibold text-ready"> Resolved</span>}
              </p>
              </div>
              {admin && !c.byAdmin && <ResolveButton id={c.id} resolved={c.resolved} />}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor="comment" className="text-[15px] text-ink-2">
          {admin ? "Reply or leave a note for runners on this room." : "Something missing or broken? The admin sees this straight away."}
        </label>
        <textarea
          id="comment"
          ref={ref}
          rows={3}
          maxLength={1000}
          placeholder="For example: projector cable missing, need 2 more chairs"
          className="w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-[16px] outline-none placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent-soft"
        />
        {error && <p className="text-[14px] font-semibold text-late">{error}</p>}
        <button disabled={pending} className="self-start rounded-xl border-2 border-accent px-5 py-2.5 text-[16px] font-bold text-accent disabled:opacity-60">
          {pending ? "Posting…" : "Post comment"}
        </button>
      </form>
    </section>
  );
}
