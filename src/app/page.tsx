import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { getRunner } from "@/lib/session";
import { LoginForm } from "./_login/login-form";

export default async function RunnerLogin() {
  if (await getRunner()) redirect("/companies");
  const db = await getDb();
  const members = await db
    .select({ id: s.members.id, name: s.members.name })
    .from(s.members)
    .where(eq(s.members.active, true))
    .orderBy(asc(s.members.name));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(40px,env(safe-area-inset-top))]">
      <div data-status="ready" className="plate px-6 pb-6 pt-8">
        <p className="text-[15px] font-semibold opacity-80">Services committee</p>
        <h1 className="font-display text-[56px] font-extrabold leading-[0.9] tracking-tight">Room Checker</h1>
        <p className="mt-3 max-w-[30ch] text-[15px] leading-snug opacity-90">
          Get every interview room ready before the recruiter walks in.
        </p>
      </div>
      <LoginForm members={members} />
    </main>
  );
}
