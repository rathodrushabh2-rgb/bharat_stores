// Edge-safe JWT helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bs_session";
export const SESSION_DAYS = 30;

export type SessionUser = { id: number; name: string; role: "owner" | "staff" };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(s);
}

export async function signSession(u: SessionUser) {
  return new SignJWT({ name: u.name, role: u.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(u.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: Number(payload.sub), name: String(payload.name), role: payload.role === "owner" ? "owner" : "staff" };
  } catch {
    return null;
  }
}
