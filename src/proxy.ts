import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, RUNNER_COOKIE, verify, type AdminClaims, type RunnerClaims } from "@/lib/jwt";

/** Optimistic gate only; pages and actions re-check the session themselves. */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin/")) {
    const ok = await verify<AdminClaims>(req.cookies.get(ADMIN_COOKIE)?.value, "admin");
    if (!ok) return NextResponse.redirect(new URL("/admin", req.url));
  } else if (pathname.startsWith("/companies")) {
    const ok = await verify<RunnerClaims>(req.cookies.get(RUNNER_COOKIE)?.value, "runner");
    if (!ok) return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path+", "/companies/:path*"] };
