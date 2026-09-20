import { api, API_ACTOR, body } from "@/server/api";
import { getPresets } from "@/server/admin-data";
import { createPreset } from "@/server/mutations";

export const GET = api(async () => getPresets());
/** { label, group?, defaultQty?, modes?: ("offline" | "online" | "hybrid")[], sort?, active? } */
export const POST = api(async (req) => createPreset(API_ACTOR, await body(req)));
