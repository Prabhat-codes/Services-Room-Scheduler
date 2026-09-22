import { requireAdmin } from "@/lib/session";
import { templateWorkbook } from "@/server/import";

/** Blank sheet with the headers the importer reads. */
export async function GET() {
  await requireAdmin();
  const wb = await templateWorkbook();
  const body = await wb.xlsx.writeBuffer();
  return new Response(body as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="Room Allocation Template.xlsx"',
    },
  });
}
