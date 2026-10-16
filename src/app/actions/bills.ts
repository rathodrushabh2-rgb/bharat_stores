"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { auditQuery, getSettings, num, round2, round3, sql } from "@/lib/db";
import { hiName } from "@/lib/i18n";

export type BillInput = {
  customerId: number | null;
  newCustomer?: { name: string; phone?: string; address?: string } | null;
  items: { productId: number; qty: number; price: number }[];
  discount: number;
  paymentMode: "cash" | "upi" | "credit" | "partial";
  paid: number;
  delivery: "pickup" | "home";
  notes?: string;
  waMessageId?: number | null;
};

export type LastRates = Record<number, { price: number; bill_no: number; date: string }>;

async function lastRatesFor(customerId: number): Promise<LastRates> {
  // For each product: the rate on the most recent (not cancelled) bill of this customer that has it.
  const rows = await sql`
    SELECT DISTINCT ON (bi.product_id) bi.product_id, bi.price, b.bill_no, b.created_at
    FROM bill_items bi JOIN bills b ON b.id = bi.bill_id
    WHERE b.customer_id = ${customerId} AND b.status <> 'cancelled' AND bi.product_id IS NOT NULL
    ORDER BY bi.product_id, b.created_at DESC, b.id DESC`;
  return Object.fromEntries(rows.map((r) => [r.product_id, { price: num(r.price), bill_no: r.bill_no, date: String(r.created_at) }]));
}

/** Rates this customer paid last time, per product (used by "Apply old rates"). */
export async function getLastRates(customerId: number): Promise<LastRates> {
  await requireUser();
  if (!Number.isInteger(customerId)) return {};
  return lastRatesFor(customerId);
}

const LAST_BILL = sql.unsafe("currval(pg_get_serial_sequence('bills', 'id'))");

/**
 * Creates a bill and, in one DB transaction: its items, stock reduction, stock moves,
 * customer khata entries, and the audit record.
 */
export async function createBill(input: BillInput): Promise<{ error: string } | { id: number }> {
  const me = await requireUser();
  const isOwner = me.role === "owner";
  const canEditRate = isOwner || (await getSettings()).staff_can_edit_rate === "1";

  const lines = input.items.filter((i) => i.qty > 0);
  if (!lines.length) return { error: "Add at least one item / कम से कम एक सामान जोड़ें" };
  if (!["cash", "upi", "credit", "partial"].includes(input.paymentMode)) return { error: "Invalid payment" };

  const products = await sql`SELECT id, name, name_hi, unit, price FROM products WHERE id = ANY(${lines.map((l) => l.productId)})`;
  const byId = new Map(products.map((p) => [p.id, p]));
  // Without rate-edit rights, a rate may only be the list price or this customer's previous rate.
  const lastRates = !canEditRate && input.customerId ? await lastRatesFor(input.customerId) : {};
  const items = [];
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p) return { error: "Product not found" };
    const qty = round3(Number(l.qty));
    if (!(qty > 0)) return { error: `Wrong quantity for ${p.name}` };
    const listPrice = num(p.price);
    const wanted = Number.isFinite(l.price) && l.price >= 0 ? round2(l.price) : listPrice;
    const price = canEditRate || wanted === lastRates[p.id]?.price ? wanted : listPrice;
    items.push({ product_id: p.id, name: p.name, name_hi: hiName(p), unit: p.unit, qty, price, list_price: listPrice, amount: round2(qty * price) });
  }

  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  const discount = canEditRate ? round2(Math.min(Math.max(Number(input.discount) || 0, 0), subtotal)) : 0;
  const total = round2(subtotal - discount);
  let paid: number;
  switch (input.paymentMode) {
    case "cash":
    case "upi":
      paid = total;
      break;
    case "credit":
      paid = 0;
      break;
    case "partial":
      paid = round2(Number(input.paid) || 0);
      if (paid <= 0 || paid >= total) return { error: "Part payment must be more than 0 and less than total" };
  }

  // Customer: existing, new, or walk-in.
  let customerId = input.customerId;
  if (!customerId && input.newCustomer?.name?.trim()) {
    const nc = input.newCustomer;
    const phone = nc.phone?.replace(/[^\d+]/g, "") || null;
    const existing = phone ? await sql`SELECT id FROM customers WHERE phone = ${phone}` : [];
    if (existing.length) customerId = existing[0].id;
    else {
      const [row] = await sql`INSERT INTO customers (name, phone, address) VALUES (${nc.name.trim()}, ${phone}, ${nc.address?.trim() || null}) RETURNING id`;
      customerId = row.id;
      await auditQuery(me.id, "customer_create", "customer", row.id, { name: nc.name, phone });
    }
  }
  if (!customerId && (input.paymentMode === "credit" || input.paymentMode === "partial")) {
    return { error: "उधार / थोड़ा जमा के लिए ग्राहक चुनें / Choose a customer for udhaar" };
  }
  const [cust] = customerId ? await sql`SELECT id, name, phone, address FROM customers WHERE id = ${customerId}` : [null];
  if (customerId && !cust) return { error: "Customer not found" };

  const itemsJson = JSON.stringify(items);
  const source = input.waMessageId ? "whatsapp" : "shop";
  const delivery = input.delivery === "home" ? "home" : "pickup";
  const notes = input.notes?.trim() || null;

  const results = await sql.transaction([
    sql`INSERT INTO bills (customer_id, cust_name, cust_phone, cust_address, delivery, subtotal, discount, total, paid, payment_mode, source, notes, created_by)
        VALUES (${customerId}, ${cust?.name ?? null}, ${cust?.phone ?? null}, ${cust?.address ?? null}, ${delivery}, ${subtotal}, ${discount}, ${total},
                ${paid}, ${input.paymentMode}, ${source}, ${notes}, ${me.id})
        RETURNING id, bill_no`,
    sql`INSERT INTO bill_items (bill_id, product_id, name, name_hi, unit, qty, price, list_price, amount)
        SELECT ${LAST_BILL}, x.product_id, x.name, x.name_hi, x.unit, x.qty, x.price, x.list_price, x.amount
        FROM jsonb_to_recordset(${itemsJson}::jsonb)
          AS x(product_id int, name text, name_hi text, unit text, qty numeric, price numeric, list_price numeric, amount numeric)`,
    sql`UPDATE products p SET stock = p.stock - x.qty, updated_at = now()
        FROM (SELECT product_id, sum(qty) AS qty FROM jsonb_to_recordset(${itemsJson}::jsonb) AS y(product_id int, qty numeric) GROUP BY product_id) x
        WHERE p.id = x.product_id`,
    sql`INSERT INTO stock_moves (product_id, qty, reason, bill_id, created_by)
        SELECT x.product_id, -x.qty, 'sale', ${LAST_BILL}, ${me.id}
        FROM jsonb_to_recordset(${itemsJson}::jsonb) AS x(product_id int, qty numeric)`,
    ...(customerId
      ? [
          sql`INSERT INTO ledger (customer_id, kind, amount, bill_id, created_by) VALUES (${customerId}, 'bill', ${total}, ${LAST_BILL}, ${me.id})`,
          ...(paid > 0
            ? [
                sql`INSERT INTO ledger (customer_id, kind, amount, bill_id, mode, created_by)
                    VALUES (${customerId}, 'payment', ${-paid}, ${LAST_BILL}, ${input.paymentMode === "upi" ? "upi" : "cash"}, ${me.id})`,
              ]
            : []),
        ]
      : []),
    ...(input.waMessageId ? [sql`UPDATE wa_messages SET status = 'done', bill_id = ${LAST_BILL} WHERE id = ${input.waMessageId}`] : []),
    sql`INSERT INTO audit_log (user_id, action, entity, entity_id, details)
        VALUES (${me.id}, 'bill_create', 'bill', ${LAST_BILL}, ${JSON.stringify({
          total,
          paid,
          mode: input.paymentMode,
          items: items.length,
          customerId,
          rate_changes: items.filter((i) => i.price !== i.list_price).map((i) => ({ name: i.name, list: i.list_price, billed: i.price })),
        })}::jsonb)`,
  ]);

  revalidatePath("/bills");
  revalidatePath("/");
  return { id: (results[0] as any[])[0].id };
}

const NEXT: Record<string, string> = { packed: "new", delivered: "packed" };

export async function setBillStatus(id: number, status: "packed" | "delivered") {
  const me = await requireUser();
  if (!NEXT[status]) return;
  // Allow skipping straight from new to delivered.
  const allowed = status === "delivered" ? ["new", "packed"] : ["new"];
  await sql.transaction([
    sql`UPDATE bills SET status = ${status},
          delivered_by = CASE WHEN ${status} = 'delivered' THEN ${me.id}::int ELSE delivered_by END,
          delivered_at = CASE WHEN ${status} = 'delivered' THEN now() ELSE delivered_at END
        WHERE id = ${id} AND status = ANY(${allowed})`,
    auditQuery(me.id, `bill_${status}`, "bill", id),
  ]);
  revalidatePath(`/bills/${id}`);
  revalidatePath("/bills");
}

/** Owner only: cancels a bill, returns stock, and reverses the unpaid part in the khata. */
export async function cancelBill(id: number, reason: string) {
  const me = await requireOwner();
  const [b] = await sql`SELECT * FROM bills WHERE id = ${id}`;
  if (!b || b.status === "cancelled") return;
  const unpaid = round2(num(b.total) - num(b.paid));
  await sql.transaction([
    // Divides by zero (aborting the whole transaction) if another cancel already won.
    sql`WITH u AS (UPDATE bills SET status = 'cancelled', notes = concat_ws(' | ', notes, ${"Cancelled: " + (reason || "-")}::text)
                   WHERE id = ${id} AND status <> 'cancelled' RETURNING id)
        SELECT 1 / count(*) FROM u`,
    sql`UPDATE products p SET stock = p.stock + x.qty, updated_at = now()
        FROM (SELECT product_id, sum(qty) AS qty FROM bill_items WHERE bill_id = ${id} AND product_id IS NOT NULL GROUP BY product_id) x
        WHERE p.id = x.product_id`,
    sql`INSERT INTO stock_moves (product_id, qty, reason, bill_id, created_by)
        SELECT product_id, qty, 'cancel', ${id}, ${me.id} FROM bill_items WHERE bill_id = ${id} AND product_id IS NOT NULL`,
    ...(b.customer_id && unpaid !== 0
      ? [
          sql`INSERT INTO ledger (customer_id, kind, amount, bill_id, note, created_by)
              VALUES (${b.customer_id}, 'adjust', ${-unpaid}, ${id}, ${`Bill #${b.bill_no} cancelled / रद्द`}, ${me.id})`,
        ]
      : []),
    auditQuery(me.id, "bill_cancel", "bill", id, { bill_no: b.bill_no, total: num(b.total), paid: num(b.paid), reason }),
  ]);
  revalidatePath(`/bills/${id}`);
  revalidatePath("/bills");
}
