import { isAdmin } from "@/lib/session";
import { getOpenCommentCount } from "@/server/board";
import { AdminNav } from "@/components/admin/nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isAdmin())) return children;
  const openComments = await getOpenCommentCount();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
      <AdminNav openComments={openComments} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
