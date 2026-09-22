import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { Page, PageHeader } from "@/components/admin/ui";
import { ImportSheet } from "@/components/admin/import-sheet";
import { dayKey } from "@/lib/time";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  await requireAdmin();
  return (
    <Page className="max-w-5xl">
      <PageHeader title="Import a schedule" sub="Upload the room allocation sheet and every company, time slot and room on it is created in one go." />
      <ImportSheet today={dayKey(new Date())} />
    </Page>
  );
}
