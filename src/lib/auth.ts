import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession, type SessionUser } from "./session";

export type { SessionUser };

export async function startSession(u: SessionUser) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(u), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current user, re-checked against the DB so deactivated staff lose access immediately. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const rows = await sql`SELECT id, name, role FROM users WHERE id = ${s.id} AND active`;
  if (!rows.length) return null;
  return { id: rows[0].id, name: rows[0].name, role: rows[0].role };
});

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireOwner() {
  const u = await requireUser();
  if (u.role !== "owner") redirect("/");
  return u;
}
