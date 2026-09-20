import { NextResponse } from "next/server";
import { api, API_ACTOR, body } from "@/server/api";
import { getBoard } from "@/server/board";
import { saveCompany } from "@/server/mutations";

export const GET = api(async () => getBoard());
/**
 * { name, spocName?, spocPhone?, mode, notes?, items: [{ label, group?, qty?, note? }],
 *   slots: [{ startsAt, endsAt, roomIds: number[] }], force? }
 * Responds 409 with { conflicts } when rooms are double-booked; send force: true to override.
 */
export const POST = api(async (req) => {
  const r = await saveCompany(API_ACTOR, await body(req));
  return NextResponse.json(r, { status: r.ok ? 201 : 409 });
});
