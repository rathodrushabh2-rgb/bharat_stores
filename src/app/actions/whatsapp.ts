"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionForm";
import { requireUser } from "@/lib/auth";
import { auditQuery, sql } from "@/lib/db";
import { formStr } from "@/lib/validate";

export async function addWaMessage(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const body = formStr(fd.get("body"));
  if (!body) return { error: "Write the order / ऑर्डर लिखें" };
  const [row] = await sql`INSERT INTO wa_messages (from_phone, from_name, body) VALUES (${formStr(fd.get("phone"))}, ${formStr(fd.get("name"))}, ${body}) RETURNING id`;
  await auditQuery(me.id, "wa_manual_add", "wa_message", row.id);
  revalidatePath("/whatsapp");
  return { ok: "✓" };
}

export async function setWaStatus(id: number, status: "ignored" | "new") {
  const me = await requireUser();
  await sql.transaction([sql`UPDATE wa_messages SET status = ${status} WHERE id = ${id} AND status <> 'done'`, auditQuery(me.id, `wa_${status}`, "wa_message", id)]);
  revalidatePath("/whatsapp");
}
