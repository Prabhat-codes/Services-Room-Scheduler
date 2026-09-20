import { SignJWT, jwtVerify } from "jose";

export const RUNNER_COOKIE = "rc_runner";
export const ADMIN_COOKIE = "rc_admin";

export type RunnerClaims = { role: "runner"; mid: number; name: string };
export type AdminClaims = { role: "admin" };

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

export async function sign(claims: RunnerClaims | AdminClaims, days: number) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(key());
}

export async function verify<T extends RunnerClaims | AdminClaims>(token: string | undefined, role: T["role"]) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.role === role ? (payload as unknown as T) : null;
  } catch {
    return null;
  }
}
