"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/ActionForm";
import { requireOwner, requireUser } from "@/lib/auth";
import { auditQuery, num, round2, round3, sql } from "@/lib/db";
import { toHindi } from "@/lib/hindi";
import { UNITS } from "@/lib/i18n";
import { formNum, formStr } from "@/lib/validate";

function readProduct(fd: FormData) {
  const name = formStr(fd.get("name"));
  const unit = String(fd.get("unit") ?? "kg");
  const price = formNum(fd.get("price"));
  if (!name) return { error: "Name is required / नाम ज़रूरी है" } as const;
  if (!UNITS[unit]) return { error: "Invalid unit" } as const;
  if (price === null || price < 0) return { error: "Enter a valid price / सही भाव डालें" } as const;
  const cost = formNum(fd.get("cost_price"));
  return {
    data: {
      name,
      name_hi: formStr(fd.get("name_hi")) ?? toHindi(name),
      category: formStr(fd.get("category")),
      unit,
      price: round2(price),
      cost_price: cost === null ? null : round2(cost),
      low_stock_at: round3(formNum(fd.get("low_stock_at")) ?? 0),
    },
  } as const;
}

export async function createProduct(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const r = readProduct(fd);
  if ("error" in r) return { error: r.error };
  const p = r.data;
  const opening = round3(formNum(fd.get("stock")) ?? 0);
  const [row] = await sql`INSERT INTO products (name, name_hi, category, unit, price, cost_price, stock, low_stock_at)
    VALUES (${p.name}, ${p.name_hi}, ${p.category}, ${p.unit}, ${p.price}, ${p.cost_price}, ${opening}, ${p.low_stock_at}) RETURNING id`;
  await sql.transaction([
    sql`INSERT INTO price_history (product_id, old_price, new_price, changed_by) VALUES (${row.id}, NULL, ${p.price}, ${me.id})`,
    ...(opening ? [sql`INSERT INTO stock_moves (product_id, qty, reason, created_by) VALUES (${row.id}, ${opening}, 'opening', ${me.id})`] : []),
    auditQuery(me.id, "product_create", "product", row.id, { ...p, stock: opening }),
  ]);
  revalidatePath("/products");
  redirect(fd.get("again") ? "/products/new?added=1" : `/products/${row.id}`);
}

export async function updateProduct(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const id = Number(fd.get("id"));
  const r = readProduct(fd);
  if ("error" in r) return { error: r.error };
  const p = r.data;
  const active = fd.get("active") === "on";
  const [old] = await sql`SELECT * FROM products WHERE id = ${id}`;
  if (!old) return { error: "Not found" };
  await sql.transaction([
    sql`UPDATE products SET name = ${p.name}, name_hi = ${p.name_hi}, category = ${p.category}, unit = ${p.unit}, price = ${p.price},
        cost_price = ${p.cost_price}, low_stock_at = ${p.low_stock_at}, active = ${active}, updated_at = now() WHERE id = ${id}`,
    ...(num(old.price) !== p.price
      ? [sql`INSERT INTO price_history (product_id, old_price, new_price, changed_by) VALUES (${id}, ${old.price}, ${p.price}, ${me.id})`]
      : []),
    auditQuery(me.id, "product_update", "product", id, { before: { name: old.name, price: num(old.price), active: old.active }, after: { ...p, active } }),
  ]);
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { ok: "✓ Saved / सेव हो गया" };
}

/** Bulk price update from the price list page; fields are named price_<id>. */
export async function updatePrices(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const wanted = new Map<number, number>();
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("price_")) continue;
    const n = formNum(v);
    if (n === null || n < 0) continue;
    wanted.set(Number(k.slice(6)), round2(n));
  }
  if (!wanted.size) return { ok: "No changes" };
  const current = await sql`SELECT id, name, price FROM products WHERE id = ANY(${[...wanted.keys()]})`;
  const changes = current.filter((c) => num(c.price) !== wanted.get(c.id));
  if (!changes.length) return { ok: "No changes / कोई बदलाव नहीं" };
  await sql.transaction(
    changes.flatMap((c) => {
      const np = wanted.get(c.id)!;
      return [
        sql`UPDATE products SET price = ${np}, updated_at = now() WHERE id = ${c.id}`,
        sql`INSERT INTO price_history (product_id, old_price, new_price, changed_by) VALUES (${c.id}, ${c.price}, ${np}, ${me.id})`,
        auditQuery(me.id, "price_change", "product", c.id, { name: c.name, from: num(c.price), to: np }),
      ];
    }),
  );
  revalidatePath("/products");
  return { ok: `✓ ${changes.length} price(s) updated / भाव बदले गए` };
}

export async function stockIn(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = Number(fd.get("id"));
  const q = formNum(fd.get("qty"));
  if (q === null || q <= 0) return { error: "Enter quantity / मात्रा डालें" };
  const qty = round3(q);
  const cost = formNum(fd.get("cost_price"));
  const note = formStr(fd.get("note"));
  await sql.transaction([
    sql`UPDATE products SET stock = stock + ${qty}, updated_at = now() WHERE id = ${id}`,
    ...(cost !== null && me.role === "owner" ? [sql`UPDATE products SET cost_price = ${round2(cost)} WHERE id = ${id}`] : []),
    sql`INSERT INTO stock_moves (product_id, qty, reason, note, created_by) VALUES (${id}, ${qty}, 'purchase', ${note}, ${me.id})`,
    auditQuery(me.id, "stock_in", "product", id, { qty, cost, note }),
  ]);
  revalidatePath(`/products/${id}`);
  return { ok: `✓ +${qty}` };
}

export async function adjustStock(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const id = Number(fd.get("id"));
  const counted = formNum(fd.get("counted"));
  if (counted === null) return { error: "Enter counted stock" };
  const [p] = await sql`SELECT stock FROM products WHERE id = ${id}`;
  const diff = round3(counted - num(p.stock));
  if (diff === 0) return { ok: "No change / कोई बदलाव नहीं" };
  const note = formStr(fd.get("note"));
  await sql.transaction([
    sql`UPDATE products SET stock = stock + ${diff}, updated_at = now() WHERE id = ${id}`,
    sql`INSERT INTO stock_moves (product_id, qty, reason, note, created_by) VALUES (${id}, ${diff}, 'adjust', ${note}, ${me.id})`,
    auditQuery(me.id, "stock_adjust", "product", id, { from: num(p.stock), to: counted, note }),
  ]);
  revalidatePath(`/products/${id}`);
  return { ok: `✓ ${diff > 0 ? "+" : ""}${diff}` };
}

/** Fills the Hindi name of every product that has none. */
export async function fillMissingHindi(): Promise<ActionResult> {
  const me = await requireOwner();
  const rows = await sql`SELECT id, name FROM products WHERE name_hi IS NULL OR btrim(name_hi) = ''`;
  if (!rows.length) return { ok: "✓ 0" };
  const data = JSON.stringify(rows.map((r) => ({ id: r.id, name_hi: toHindi(r.name) })));
  await sql.transaction([
    sql`UPDATE products p SET name_hi = x.name_hi FROM jsonb_to_recordset(${data}::jsonb) AS x(id int, name_hi text) WHERE p.id = x.id`,
    auditQuery(me.id, "products_fill_hindi", "product", null, { count: rows.length }),
  ]);
  revalidatePath("/products");
  return { ok: `✓ ${rows.length}` };
}
