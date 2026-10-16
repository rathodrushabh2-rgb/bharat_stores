// Spreadsheet helpers for the rate upload (browser side).
import type { RateRow } from "@/app/actions/upload";

/** Minimal CSV parser: quoted fields, escaped quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const HEADERS: Record<keyof RateRow, string[]> = {
  id: ["id", "product id", "code", "आईडी"],
  name: ["name", "product", "product name", "item", "item name", "english name", "name (english)", "नाम"],
  name_hi: ["hindi name", "hindi", "name_hi", "name (hindi)", "हिंदी नाम", "हिंदी"],
  unit: ["unit", "uom", "इकाई"],
  price: ["price", "rate", "selling price", "sale price", "mrp", "भाव", "रेट", "बेचने का भाव"],
  cost_price: ["purchase price", "cost", "cost price", "buying price", "purchase rate", "खरीद भाव"],
  category: ["category", "group", "श्रेणी"],
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[₹,\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : -1; // NaN does not survive JSON; -1 is reported by the server as a wrong price
}

/** Turns a sheet (first row = headers) into rate rows. Throws if no name/price column is found. */
export function sheetToRows(sheet: unknown[][]): RateRow[] {
  if (!sheet.length) throw new Error("File is empty / फ़ाइल खाली है");
  const header = sheet[0].map((h) => String(h ?? "").trim().toLowerCase());
  const col = Object.fromEntries(
    (Object.keys(HEADERS) as (keyof RateRow)[]).map((k) => [k, header.findIndex((h) => HEADERS[k].includes(h))]),
  ) as Record<keyof RateRow, number>;
  if (col.name < 0 && col.id < 0) throw new Error('No "Name" column found / "Name" कॉलम नहीं मिला');
  if (col.price < 0) throw new Error('No "Price" column found / "Price" कॉलम नहीं मिला');
  const get = (r: unknown[], k: keyof RateRow) => (col[k] >= 0 ? r[col[k]] : null);
  const str = (v: unknown) => (v === null || v === undefined || String(v).trim() === "" ? null : String(v).trim());
  return sheet.slice(1).map((r) => {
    const id = toNum(get(r, "id"));
    return {
      id: id && Number.isInteger(id) ? id : null,
      name: str(get(r, "name")),
      name_hi: str(get(r, "name_hi")),
      unit: str(get(r, "unit")),
      price: toNum(get(r, "price")),
      cost_price: toNum(get(r, "cost_price")),
      category: str(get(r, "category")),
    };
  });
}
