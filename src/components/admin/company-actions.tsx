"use client";

import { useTransition } from "react";
import { Flag, Trash2 } from "lucide-react";
import { deleteCompanyAction, finishCompanyAction } from "@/app/actions/admin";
import { btn } from "./ui";

export function CompanyActions({ id, name, past }: { id: number; name: string; past: boolean }) {
  const [pending, start] = useTransition();
  return (
    <>
      {!past && (
        <button
          disabled={pending}
          className={btn.quiet}
          onClick={() => {
            if (confirm(`Mark ${name} as finished now? Upcoming slots are removed and the company moves to Past.`))
              start(async () => {
                const r = await finishCompanyAction(id);
                if (!r.ok) alert(r.error);
              });
          }}
        >
          <Flag aria-hidden className="size-4" /> Mark finished
        </button>
      )}
      <button
        disabled={pending}
        className={btn.danger}
        onClick={() => {
          if (confirm(`Delete ${name}? Its rooms, ticks and comments are removed for good.`))
            start(async () => {
              const r = await deleteCompanyAction(id);
              if (r && !r.ok) alert(r.error);
            });
        }}
      >
        <Trash2 aria-hidden className="size-4" /> Delete
      </button>
    </>
  );
}
