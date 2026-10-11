// Edge-safe JWT helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bs_session";
export const SESSION_DAYS = 30;

export type SessionUser = { id: number; name: string; role: "owner" | "staff" };

let cached: Promise<Uint8Array> | null = null;

/**
 * Signing key: SESSION_SECRET if set, otherwise derived from DATABASE_URL
 * (already a server-only secret), so a deployment needs only one variable.
 */
function secret(): Promise<Uint8Array> {
  return (cached ??= (async () => {
    const s = process.env.SESSION_SECRET;
    if (s && s.length >= 32) return new TextEncoder().encode(s);
    const db = process.env.DATABASE_URL;
    if (!db) throw new Error("SESSION_SECRET or DATABASE_URL must be set");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bharat-stores-session:" + db));
    return new Uint8Array(digest);
  })());
}

export async function signSession(u: SessionUser) {
  return new SignJWT({ name: u.name, role: u.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(u.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(await secret());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    return { id: Number(payload.sub), name: String(payload.name), role: payload.role === "owner" ? "owner" : "staff" };
  } catch {
    return null;
  }
}
