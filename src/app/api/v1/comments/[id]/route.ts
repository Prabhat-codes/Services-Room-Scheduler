import { z } from "zod";
import { api, API_ACTOR, body, idOf } from "@/server/api";
import { setCommentResolved } from "@/server/mutations";

type Ctx = RouteContext<"/api/v1/comments/[id]">;
/** { resolved: boolean } */
export const PATCH = api(async (req, ctx: Ctx) => {
  const { resolved } = z.object({ resolved: z.boolean() }).parse(await body(req));
  return setCommentResolved(API_ACTOR, await idOf(ctx), resolved);
});
