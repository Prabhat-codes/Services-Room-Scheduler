import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiIsAdmin } from "@/lib/session";
import { UserError, type Actor } from "./types";

export const API_ACTOR: Actor = { kind: "admin", id: null, name: "Admin (API)" };

/** Wrap a route handler: admin auth (cookie or Bearer ADMIN_API_KEY), JSON body, JSON errors. */
export function api<C>(fn: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    if (!(await apiIsAdmin())) return NextResponse.json({ error: "Unauthorized. Send Authorization: Bearer <ADMIN_API_KEY>." }, { status: 401 });
    try {
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input", issues: e.issues }, { status: 400 });
      if (e instanceof SyntaxError) return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
      throw e;
    }
  };
}

export const body = (req: Request) => req.json() as Promise<unknown>;
export const idOf = async (ctx: { params: Promise<{ id: string }> }) => {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new UserError("Invalid id.");
  return id;
};
