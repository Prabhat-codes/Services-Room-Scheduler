import { api } from "@/server/api";
import { getActivity } from "@/server/admin-data";

/** ?limit=300 (max 2000) */
export const GET = api(async (req) => getActivity(Math.min(Number(new URL(req.url).searchParams.get("limit")) || 300, 2000)));
