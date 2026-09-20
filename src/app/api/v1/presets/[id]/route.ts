import { api, API_ACTOR, body, idOf } from "@/server/api";
import { deletePreset, updatePreset } from "@/server/mutations";

type Ctx = RouteContext<"/api/v1/presets/[id]">;
export const PATCH = api(async (req, ctx: Ctx) => updatePreset(API_ACTOR, await idOf(ctx), await body(req)));
export const DELETE = api(async (_req, ctx: Ctx) => deletePreset(API_ACTOR, await idOf(ctx)));
