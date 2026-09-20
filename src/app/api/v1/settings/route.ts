import { z } from "zod";
import { api, API_ACTOR, body } from "@/server/api";
import { getLateMinutes } from "@/server/board";
import { setLateMinutes } from "@/server/mutations";

export const GET = api(async () => ({ lateMinutes: await getLateMinutes() }));
/** { lateMinutes }: how long before a slot starts an unready room turns red. */
export const PUT = api(async (req) => {
  const { lateMinutes } = z.object({ lateMinutes: z.number() }).parse(await body(req));
  await setLateMinutes(API_ACTOR, lateMinutes);
  return { lateMinutes };
});
