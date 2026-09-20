import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getBookings, getBuildings, getCompanyForEdit, getPresets, getSpocOptions } from "@/server/admin-data";
import { CompanyForm } from "@/components/admin/company-form";
import { Page, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit company" };

export default async function EditCompanyPage({ params }: PageProps<"/admin/companies/[id]/edit">) {
  await requireAdmin();
  const company = await getCompanyForEdit(Number((await params).id));
  if (!company) notFound();
  const [presets, buildings, bookings, spocs] = await Promise.all([getPresets(), getBuildings({ activeOnly: true }), getBookings(), getSpocOptions()]);
  return (
    <Page className="max-w-5xl">
      <PageHeader
        title={`Edit ${company.name}`}
        sub="Changes to the checklist reach every room that doesn't have its own list. Ticks on items that stay are kept."
      />
      <CompanyForm presets={presets} buildings={buildings} bookings={bookings} spocs={spocs} initial={company} />
    </Page>
  );
}
