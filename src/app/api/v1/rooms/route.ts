import { api, API_ACTOR, body } from "@/server/api";
import { getBuildings } from "@/server/admin-data";
import { createRooms } from "@/server/mutations";

export const GET = api(async () => (await getBuildings()).flatMap((b) => b.rooms.map((r) => ({ ...r, buildingId: b.id, building: b.name }))));
/** { buildingId, floor?, numbers: "41-46, 50" } */
export const POST = api(async (req) => createRooms(API_ACTOR, await body(req)));
