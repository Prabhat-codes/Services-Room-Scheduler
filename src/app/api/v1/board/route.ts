import { api } from "@/server/api";
import { getBoard } from "@/server/board";

/** Live status of every company, slot and room. */
export const GET = api(async () => getBoard());
