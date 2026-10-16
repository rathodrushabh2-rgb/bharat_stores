"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionForm";
import { requireOwner } from "@/lib/auth";
import { auditQuery, sql } from "@/lib/db";
import { formStr, validPin, validUsername } from "@/lib/validate";

export async function addUser(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const name = formStr(fd.get("name"));
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const pin = String(fd.get("pin") ?? "");
  const role = fd.get("role") === "owner" ? "owner" : "staff";
  if (!name) return { error: "Name is required" };
  if (!validUsername(username)) return { error: "Username: 3-20 letters/numbers (a-z, 0-9), no spaces" };
  if (!validPin(pin)) return { error: "PIN must be 4 to 6 digits" };
  const rows = await sql`INSERT INTO users (name, username, pin_hash, role) VALUES (${name}, ${username}, ${await bcrypt.hash(pin, 10)}, ${role})
                         ON CONFLICT (username) DO NOTHING RETURNING id`;
  if (!rows.length) return { error: "Username already taken / यह यूज़रनेम पहले से है" };
  await auditQuery(me.id, "user_add", "user", rows[0].id, { name, username, role });
  revalidatePath("/staff");
  return { ok: `✓ ${name}` };
}

export async function setUserActive(id: number, active: boolean) {
  const me = await requireOwner();
  if (id === me.id) return;
  await sql.transaction([sql`UPDATE users SET active = ${active} WHERE id = ${id}`, auditQuery(me.id, active ? "user_activate" : "user_deactivate", "user", id)]);
  revalidatePath("/staff");
}

export async function resetUserPin(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const id = Number(fd.get("id"));
  const pin = String(fd.get("pin") ?? "");
  if (!validPin(pin)) return { error: "PIN must be 4 to 6 digits" };
  await sql.transaction([
    sql`UPDATE users SET pin_hash = ${await bcrypt.hash(pin, 10)}, failed_logins = 0, locked_until = NULL WHERE id = ${id}`,
    auditQuery(me.id, "user_reset_pin", "user", id),
  ]);
  return { ok: "✓" };
}

const SETTING_KEYS = ["shop_name", "shop_name_hi", "shop_address", "shop_phone", "gstin", "bill_footer"];

export async function saveSettings(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const values = [
    ...SETTING_KEYS.map((k) => [k, String(fd.get(k) ?? "").trim()] as const),
    ["staff_can_edit_rate", fd.get("staff_can_edit_rate") === "on" ? "1" : "0"] as const,
  ];
  await sql.transaction([
    ...values.map(([k, v]) => sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`),
    auditQuery(me.id, "settings_update", "settings", null, Object.fromEntries(values)),
  ]);
  revalidatePath("/", "layout");
  return { ok: "✓ Saved / सेव हो गया" };
}
