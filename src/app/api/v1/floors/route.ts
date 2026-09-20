import { api, API_ACTOR, body } from "@/server/api";
import { renameFloor } from "@/server/mutations";

/** Rename a floor in one building: { buildingId, from, to } */
export const PATCH = api(async (req) => renameFloor(API_ACTOR, await body(req)));
