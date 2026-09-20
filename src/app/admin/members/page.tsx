import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { getMembers } from "@/server/admin-data";
import { Page, PageHeader } from "@/components/admin/ui";
import { MembersManager } from "@/components/admin/members-manager";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  await requireAdmin();
  const members = await getMembers();
  return (
    <Page className="max-w-4xl">
      <PageHeader title="Members" sub="Runners sign in by picking their name and typing their roll number as the password. Capitals don't matter. Mobile numbers are used when a member is a company SPOC." />
      <MembersManager members={members.map(({ id, name, rollNumber, phone, active }) => ({ id, name, rollNumber, phone, active }))} />
    </Page>
  );
}
