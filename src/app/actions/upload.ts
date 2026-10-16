"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { auditQuery, num, round2, sql } from "@/lib/db";
import { toHindi } from "@/lib/hindi";

/** One spreadsheet row after header mapping. Empty cells are null and mean "leave as is". */
export type RateRow = {
  id: number | null;
  name: string | null;
  name_hi: string | null;
  unit: string | null;
  price: number | null;
  cost_price: number | null;
  category: string | null;
};

type Product = { id: number; name: string; name_hi: string | null; unit: string; price: number; cost_price: number | null; category: string | null };
type Change = { field: string; from: string | number | null; to: string | number | null };

export type UploadPlan = {
  updates: { id: number; name: string; changes: Change[] }[];
  creates: { name: string; name_hi: string; unit: string; price: number; cost_price: number | null; category: string | null }[];
  errors: { row: number; message: string }[];
  unchanged: number;
};

const UNIT_ALIASES: Record<string, string> = {
  kg: "kg", kgs: "kg", kilo: "kg", kilogram: "kg", "किलो": "kg",
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", "ग्राम": "g",
  l: "litre", ltr: "litre", litre: "litre", liter: "litre", lt: "litre", "लीटर": "litre",
  ml: "ml", "मि.ली.": "ml",
  pcs: "pcs", pc: "pcs", piece: "pcs", pieces: "pcs", nos: "pcs", no: "pcs", nag: "pcs", "नग": "pcs",
  packet: "packet", pkt: "packet", packets: "packet", "पैकेट": "packet",
  dozen: "dozen", dz: "dozen", "दर्जन": "dozen",
  box: "box", "डिब्बा": "box", bag: "bag", "बोरी": "bag", bottle: "bottle", btl: "bottle", "बोतल": "bottle",
};

function normUnit(u: string | null): string | null | undefined {
  if (!u) return null;
  return UNIT_ALIASES[u.trim().toLowerCase()]; // undefined = unknown unit
}

async function makePlan(rows: RateRow[], createNew: boolean): Promise<{ plan: UploadPlan; final: Product[] }> {
  const existing = (await sql`SELECT id, name, name_hi, unit, price, cost_price, category FROM products`).map(
    (p): Product => ({ id: p.id, name: p.name, name_hi: p.name_hi, unit: p.unit, price: num(p.price), cost_price: p.cost_price === null ? null : num(p.cost_price), category: p.category }),
  );
  const byId = new Map(existing.map((p) => [p.id, p]));
  const byName = new Map(existing.map((p) => [p.name.trim().toLowerCase(), p]));

  const plan: UploadPlan = { updates: [], creates: [], errors: [], unchanged: 0 };
  const final: Product[] = [];
  const seen = new Set<string>();

  rows.forEach((r, i) => {
    const rowNo = i + 2; // row 1 is the header
    const name = r.name?.trim() || null;
    if (!name && !r.id) {
      if (r.price !== null || r.name_hi) plan.errors.push({ row: rowNo, message: "Name missing / नाम नहीं है" });
      return;
    }
    if (r.price !== null && (!Number.isFinite(r.price) || r.price < 0)) {
      plan.errors.push({ row: rowNo, message: `Wrong price / गलत भाव: ${r.price}` });
      return;
    }
    const unit = normUnit(r.unit);
    if (unit === undefined) {
      plan.errors.push({ row: rowNo, message: `Unknown unit / इकाई समझ नहीं आई: ${r.unit}` });
      return;
    }
    const match = (r.id && byId.get(r.id)) || (name ? byName.get(name.toLowerCase()) : undefined);
    const key = match ? `id:${match.id}` : `name:${name!.toLowerCase()}`;
    if (seen.has(key)) {
      plan.errors.push({ row: rowNo, message: `Repeated product / दोबारा लिखा है: ${name ?? r.id}` });
      return;
    }
    seen.add(key);

    if (match) {
      const next: Product = {
        ...match,
        name: name ?? match.name,
        name_hi: r.name_hi?.trim() || match.name_hi || toHindi(name ?? match.name),
        unit: unit ?? match.unit,
        price: r.price !== null ? round2(r.price) : match.price,
        cost_price: r.cost_price !== null && Number.isFinite(r.cost_price) ? round2(r.cost_price) : match.cost_price,
        category: r.category?.trim() || match.category,
      };
      const changes: Change[] = [];
      for (const f of ["price", "name", "name_hi", "unit", "cost_price", "category"] as const) {
        if (next[f] !== match[f]) changes.push({ field: f, from: match[f], to: next[f] });
      }
      if (changes.length) {
        plan.updates.push({ id: match.id, name: match.name, changes });
        final.push(next);
      } else plan.unchanged++;
      return;
    }

    if (r.id) {
      plan.errors.push({ row: rowNo, message: `ID ${r.id} not found / नहीं मिला` });
      return;
    }
    if (!createNew) {
      plan.errors.push({ row: rowNo, message: `New product skipped / नया सामान छोड़ा: ${name}` });
      return;
    }
    if (r.price === null) {
      plan.errors.push({ row: rowNo, message: `Price missing for new product / भाव नहीं है: ${name}` });
      return;
    }
    plan.creates.push({
      name: name!,
      name_hi: r.name_hi?.trim() || toHindi(name!),
      unit: unit ?? "kg",
      price: round2(r.price),
      cost_price: r.cost_price !== null && Number.isFinite(r.cost_price) ? round2(r.cost_price) : null,
      category: r.category?.trim() || null,
    });
  });
  return { plan, final };
}

function clean(rows: RateRow[]): RateRow[] {
  if (!Array.isArray(rows) || rows.length > 5000) throw new Error("Too many rows (max 5000)");
  return rows;
}

export async function previewRateUpload(rows: RateRow[], createNew: boolean): Promise<UploadPlan> {
  await requireOwner();
  return (await makePlan(clean(rows), createNew)).plan;
}

/** Re-plans on the server (the preview is never trusted) and applies everything in one transaction. */
export async function applyRateUpload(rows: RateRow[], createNew: boolean): Promise<{ updated: number; created: number; errors: number }> {
  const me = await requireOwner();
  const { plan, final } = await makePlan(clean(rows), createNew);
  const upd = JSON.stringify(final);
  const ins = JSON.stringify(plan.creates);
  const priceChanges = plan.updates.filter((u) => u.changes.some((c) => c.field === "price")).length;

  await sql.transaction([
    ...(final.length
      ? [
          // Price history first, while products still hold the old price.
          sql`INSERT INTO price_history (product_id, old_price, new_price, changed_by)
              SELECT p.id, p.price, x.price, ${me.id} FROM products p
              JOIN jsonb_to_recordset(${upd}::jsonb) AS x(id int, price numeric) ON p.id = x.id
              WHERE p.price <> x.price`,
          sql`UPDATE products p SET name = x.name, name_hi = x.name_hi, unit = x.unit, price = x.price,
                cost_price = x.cost_price, category = x.category, updated_at = now()
              FROM jsonb_to_recordset(${upd}::jsonb)
                AS x(id int, name text, name_hi text, unit text, price numeric, cost_price numeric, category text)
              WHERE p.id = x.id`,
        ]
      : []),
    ...(plan.creates.length
      ? [
          sql`WITH ins AS (
                INSERT INTO products (name, name_hi, unit, price, cost_price, category)
                SELECT x.name, x.name_hi, x.unit, x.price, x.cost_price, x.category
                FROM jsonb_to_recordset(${ins}::jsonb) AS x(name text, name_hi text, unit text, price numeric, cost_price numeric, category text)
                RETURNING id, price)
              INSERT INTO price_history (product_id, old_price, new_price, changed_by) SELECT id, NULL, price, ${me.id} FROM ins`,
        ]
      : []),
    auditQuery(me.id, "rate_upload", "product", null, {
      updated: final.length,
      price_changes: priceChanges,
      created: plan.creates.length,
      errors: plan.errors.length,
    }),
  ]);
  revalidatePath("/products");
  return { updated: final.length, created: plan.creates.length, errors: plan.errors.length };
}
