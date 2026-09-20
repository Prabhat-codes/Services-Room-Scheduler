import { NextResponse } from "next/server";
import { api, API_ACTOR, body, idOf } from "@/server/api";
import { getCompanyForEdit } from "@/server/admin-data";
import { getBoard } from "@/server/board";
import { deleteCompany, saveCompany } from "@/server/mutations";
import { UserError } from "@/server/types";

type Ctx = RouteContext<"/api/v1/companies/[id]">;

/** Editable definition plus live status. */
export const GET = api(async (_req, ctx: Ctx) => {
  const id = await idOf(ctx);
  const [def, [status]] = await Promise.all([getCompanyForEdit(id), getBoard({ companyId: id })]);
  if (!def) throw new UserError("Company not found.");
  return { ...def, status };
});
/** Full replacement, same shape as POST /companies. Keep slot ids to preserve ticks. */
export const PUT = api(async (req, ctx: Ctx) => {
  const input = (await body(req)) as Record<string, unknown>;
  const r = await saveCompany(API_ACTOR, { ...input, id: await idOf(ctx) });
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
});
export const DELETE = api(async (_req, ctx: Ctx) => deleteCompany(API_ACTOR, await idOf(ctx)));
