import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { getBuildings, getPresets } from "@/server/admin-data";
import { getLateMinutes } from "@/server/board";
import { Page, PageHeader } from "@/components/admin/ui";
import { BuildingsManager, PresetsManager, SettingsForm } from "@/components/admin/setup";

export const metadata: Metadata = { title: "Setup" };

export default async function SetupPage() {
  await requireAdmin();
  const [buildings, presets, lateMinutes] = await Promise.all([getBuildings(), getPresets(), getLateMinutes()]);
  return (
    <Page className="max-w-5xl">
      <PageHeader title="Setup" sub="Rooms, checklist tiles and alert timing used when scheduling companies." />
      <SettingsForm lateMinutes={lateMinutes} />
      <PresetsManager presets={presets} />
      <BuildingsManager buildings={buildings} />
    </Page>
  );
}
