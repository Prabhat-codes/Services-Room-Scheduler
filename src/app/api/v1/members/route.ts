import { api, API_ACTOR, body } from "@/server/api";
import { getMembers } from "@/server/admin-data";
import { createMember } from "@/server/mutations";

export const GET = api(async () => getMembers());
/** { name, rollNumber, active? } */
export const POST = api(async (req) => createMember(API_ACTOR, await body(req)));
