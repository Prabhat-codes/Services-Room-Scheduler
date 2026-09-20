import { api, API_ACTOR, body, idOf } from "@/server/api";
import { deleteBuilding, updateBuilding } from "@/server/mutations";

type Ctx = RouteContext<"/api/v1/buildings/[id]">;
export const PATCH = api(async (req, ctx: Ctx) => updateBuilding(API_ACTOR, await idOf(ctx), await body(req)));
export const DELETE = api(async (_req, ctx: Ctx) => deleteBuilding(API_ACTOR, await idOf(ctx)));
