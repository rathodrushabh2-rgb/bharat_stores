"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/ActionForm";
import { requireOwner, requireUser } from "@/lib/auth";
import { auditQuery, round2, sql } from "@/lib/db";
import { formNum, formStr } from "@/lib/validate";

function readCustomer(fd: FormData) {
  return {
    name: formStr(fd.get("name")),
    phone: formStr(fd.get("phone"))?.replace(/[^\d+]/g, "") ?? null,
    address: formStr(fd.get("address")),
    area: formStr(fd.get("area")),
    notes: formStr(fd.get("notes")),
  };
}

export async function createCustomer(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const c = readCustomer(fd);
  if (!c.name) return { error: "Name is required / नाम ज़रूरी है" };
  if (c.phone) {
    const dup = await sql`SELECT id, name FROM customers WHERE phone = ${c.phone}`;
    if (dup.length) return { error: `This phone is already saved for ${dup[0].name} / यह नंबर पहले से है` };
  }
  const [row] = await sql`INSERT INTO customers (name, phone, address, area, notes)
    VALUES (${c.name}, ${c.phone}, ${c.address}, ${c.area}, ${c.notes}) RETURNING id`;
  await auditQuery(me.id, "customer_create", "customer", row.id, c);
  revalidatePath("/customers");
  redirect(`/customers/${row.id}`);
}

export async function updateCustomer(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = Number(fd.get("id"));
  const c = readCustomer(fd);
  if (!c.name) return { error: "Name is required / नाम ज़रूरी है" };
  await sql.transaction([
    sql`UPDATE customers SET name = ${c.name}, phone = ${c.phone}, address = ${c.address}, area = ${c.area}, notes = ${c.notes} WHERE id = ${id}`,
    auditQuery(me.id, "customer_update", "customer", id, c),
  ]);
  revalidatePath(`/customers/${id}`);
  return { ok: "✓ Saved / सेव हो गया" };
}

export async function receivePayment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = Number(fd.get("id"));
  const amt = formNum(fd.get("amount"));
  const mode = fd.get("mode") === "upi" ? "upi" : "cash";
  if (amt === null || amt <= 0) return { error: "Enter amount / रकम डालें" };
  const amount = round2(amt);
  const note = formStr(fd.get("note"));
  await sql.transaction([
    sql`INSERT INTO ledger (customer_id, kind, amount, mode, note, created_by) VALUES (${id}, 'payment', ${-amount}, ${mode}, ${note}, ${me.id})`,
    auditQuery(me.id, "payment_received", "customer", id, { amount, mode, note }),
  ]);
  revalidatePath(`/customers/${id}`);
  return { ok: `✓ ₹${amount} जमा` };
}

export async function adjustBalance(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const id = Number(fd.get("id"));
  const amt = formNum(fd.get("amount"));
  const note = formStr(fd.get("note"));
  if (amt === null || amt <= 0) return { error: "Enter amount / रकम डालें" };
  if (!note) return { error: "Write a reason / कारण लिखें" };
  const amount = round2(amt) * (fd.get("sign") === "-1" ? -1 : 1);
  await sql.transaction([
    sql`INSERT INTO ledger (customer_id, kind, amount, note, created_by) VALUES (${id}, 'adjust', ${amount}, ${note}, ${me.id})`,
    auditQuery(me.id, "balance_adjust", "customer", id, { amount, note }),
  ]);
  revalidatePath(`/customers/${id}`);
  return { ok: "✓" };
}
