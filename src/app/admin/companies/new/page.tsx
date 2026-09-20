import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { getBookings, getBuildings, getPresets, getSpocOptions } from "@/server/admin-data";
import { CompanyForm } from "@/components/admin/company-form";
import { Page, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Schedule a company" };

export default async function NewCompanyPage() {
  await requireAdmin();
  const [presets, buildings, bookings, spocs] = await Promise.all([getPresets(), getBuildings({ activeOnly: true }), getBookings(), getSpocOptions()]);
  return (
    <Page className="max-w-5xl">
      <PageHeader title="Schedule a company" sub="The checklist you pick applies to every room. Rooms turn red if they aren't ready in time." />
      <CompanyForm presets={presets} buildings={buildings} bookings={bookings} spocs={spocs} />
    </Page>
  );
}
