import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";

function cell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Current rate list as CSV (opens in Excel), in the same format the upload accepts. */
export async function GET() {
  const user = await getUser();
  if (user?.role !== "owner") return new NextResponse("Forbidden", { status: 403 });
  const rows = await sql`SELECT id, name, name_hi, unit, price, cost_price, category FROM products WHERE active ORDER BY category NULLS LAST, name`;
  const lines = [
    ["ID", "Name", "Hindi Name", "Unit", "Price", "Purchase Price", "Category"].join(","),
    ...rows.map((r) => [r.id, r.name, r.name_hi, r.unit, r.price, r.cost_price, r.category].map(cell).join(",")),
  ];
  const date = new Date().toISOString().slice(0, 10);
  // BOM so Excel shows Hindi correctly.
  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rate-list-${date}.csv"`,
    },
  });
}
