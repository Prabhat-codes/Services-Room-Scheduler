import { api, API_ACTOR, body, idOf } from "@/server/api";
import { deleteMember, updateMember } from "@/server/mutations";

type Ctx = RouteContext<"/api/v1/members/[id]">;
/** { name?, rollNumber?, active? } */
export const PATCH = api(async (req, ctx: Ctx) => updateMember(API_ACTOR, await idOf(ctx), await body(req)));
export const DELETE = api(async (_req, ctx: Ctx) => deleteMember(API_ACTOR, await idOf(ctx)));
