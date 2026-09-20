import { api, API_ACTOR, body, idOf } from "@/server/api";
import { deleteRoom, updateRoom } from "@/server/mutations";

type Ctx = RouteContext<"/api/v1/rooms/[id]">;
/** { number?, floor?, active?, sort? } */
export const PATCH = api(async (req, ctx: Ctx) => updateRoom(API_ACTOR, await idOf(ctx), await body(req)));
export const DELETE = api(async (_req, ctx: Ctx) => deleteRoom(API_ACTOR, await idOf(ctx)));
