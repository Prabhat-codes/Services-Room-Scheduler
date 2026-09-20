import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, RUNNER_COOKIE, sign, verify, type AdminClaims, type RunnerClaims } from "./jwt";
import type { Actor } from "@/server/types";

const cookieOpts = (days: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: days * 86400,
});

export async function startRunnerSession(mid: number, name: string) {
  (await cookies()).set(RUNNER_COOKIE, await sign({ role: "runner", mid, name }, 30), cookieOpts(30));
}

export async function startAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, await sign({ role: "admin" }, 7), cookieOpts(7));
}

export async function endSession(which: "runner" | "admin") {
  (await cookies()).delete(which === "runner" ? RUNNER_COOKIE : ADMIN_COOKIE);
}

export async function getRunner() {
  return verify<RunnerClaims>((await cookies()).get(RUNNER_COOKIE)?.value, "runner");
}

export async function isAdmin() {
  return !!(await verify<AdminClaims>((await cookies()).get(ADMIN_COOKIE)?.value, "admin"));
}

export async function requireRunner(): Promise<Actor> {
  const r = await getRunner();
  if (!r) redirect("/");
  return { kind: "member", id: r.mid, name: r.name };
}

export async function requireAdmin(): Promise<Actor> {
  if (!(await isAdmin())) redirect("/admin");
  return ADMIN_ACTOR;
}

export const ADMIN_ACTOR: Actor = { kind: "admin", id: null, name: "Admin" };

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** API auth: admin cookie, or `Authorization: Bearer <ADMIN_API_KEY>`. */
export async function apiIsAdmin() {
  const auth = (await headers()).get("authorization") ?? "";
  const keyOk = !!process.env.ADMIN_API_KEY && safeEqual(auth.replace(/^Bearer\s+/i, ""), process.env.ADMIN_API_KEY);
  return keyOk || (await isAdmin());
}
