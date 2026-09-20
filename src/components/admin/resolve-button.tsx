"use client";

import { useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { resolveCommentAction } from "@/app/actions/admin";
import { btn } from "./ui";

export function ResolveButton({ id, resolved }: { id: number; resolved: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => void (await resolveCommentAction(id, !resolved)))}
      className={resolved ? btn.quiet : btn.primary}
    >
      {resolved ? <RotateCcw aria-hidden className="size-4" /> : <Check aria-hidden className="size-4" />}
      {pending ? "Saving…" : resolved ? "Reopen" : "Resolve"}
    </button>
  );
}
