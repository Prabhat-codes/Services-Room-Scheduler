import { api, API_ACTOR, body } from "@/server/api";
import { getBuildings } from "@/server/admin-data";
import { createBuilding } from "@/server/mutations";

/** Buildings with their rooms. */
export const GET = api(async () => getBuildings());
/** { name, sort? } */
export const POST = api(async (req) => createBuilding(API_ACTOR, await body(req)));
