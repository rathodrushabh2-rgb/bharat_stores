"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auditQuery, sql } from "@/lib/db";
import { endSession, requireUser, startSession } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/i18n";
import type { ActionResult } from "@/components/ActionForm";
import { validPin, validUsername } from "@/lib/validate";

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

export async function login(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const pin = String(fd.get("pin") ?? "");
  const rows = await sql`SELECT id, name, role, pin_hash, active, failed_logins, locked_until FROM users WHERE username = ${username}`;
  const u = rows[0];
  const wrong = { error: "गलत यूज़रनेम या पिन / Wrong username or PIN" };
  if (!u || !u.active) return wrong;
  if (u.locked_until && new Date(u.locked_until) > new Date()) {
    return { error: `बहुत बार गलत पिन। ${LOCK_MINUTES} मिनट बाद कोशिश करें / Too many wrong PINs, try again later` };
  }
  if (!(await bcrypt.compare(pin, u.pin_hash))) {
    const fails = u.failed_logins + 1;
    if (fails >= MAX_TRIES) {
      await sql`UPDATE users SET failed_logins = 0, locked_until = now() + make_interval(mins => ${LOCK_MINUTES}) WHERE id = ${u.id}`;
      await auditQuery(u.id, "login_locked", "user", u.id);
    } else {
      await sql`UPDATE users SET failed_logins = ${fails} WHERE id = ${u.id}`;
    }
    return wrong;
  }
  await sql`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ${u.id}`;
  await startSession({ id: u.id, name: u.name, role: u.role });
  await auditQuery(u.id, "login", "user", u.id);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function setupOwner(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const name = String(fd.get("name") ?? "").trim();
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const pin = String(fd.get("pin") ?? "");
  if (!name || !validUsername(username)) return { error: "Username: 3-20 letters/numbers, no spaces" };
  if (!validPin(pin)) return { error: "PIN must be 4 to 6 digits" };
  if (pin !== fd.get("pin2")) return { error: "PINs do not match" };
  const hash = await bcrypt.hash(pin, 10);
  // Only allowed while there are no users at all.
  const rows = await sql`INSERT INTO users (name, username, pin_hash, role)
                         SELECT ${name}, ${username}, ${hash}, 'owner'
                         WHERE NOT EXISTS (SELECT 1 FROM users) RETURNING id`;
  if (!rows.length) redirect("/login");
  await auditQuery(rows[0].id, "setup_owner", "user", rows[0].id);
  await startSession({ id: rows[0].id, name, role: "owner" });
  redirect("/");
}

export async function setLang(lang: string) {
  (await cookies()).set(LANG_COOKIE, lang === "en" ? "en" : "hi", { path: "/", maxAge: 365 * 24 * 3600 });
}

export async function changeMyPin(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const oldPin = String(fd.get("old") ?? "");
  const pin = String(fd.get("pin") ?? "");
  const rows = await sql`SELECT pin_hash FROM users WHERE id = ${me.id}`;
  if (!(await bcrypt.compare(oldPin, rows[0].pin_hash))) return { error: "Old PIN is wrong / पुराना पिन गलत है" };
  if (!validPin(pin)) return { error: "PIN must be 4 to 6 digits" };
  await sql`UPDATE users SET pin_hash = ${await bcrypt.hash(pin, 10)} WHERE id = ${me.id}`;
  await auditQuery(me.id, "change_pin", "user", me.id);
  return { ok: "✓" };
}
