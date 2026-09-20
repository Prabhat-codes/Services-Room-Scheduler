import { api } from "@/server/api";
import { getComments } from "@/server/admin-data";

/** ?show=open|resolved|all (default open) */
export const GET = api(async (req) => {
  const show = new URL(req.url).searchParams.get("show");
  return getComments(show === "resolved" || show === "all" ? show : "open");
});
