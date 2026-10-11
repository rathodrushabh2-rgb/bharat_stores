import { neon } from "@neondatabase/serverless";

// The client only connects when a query runs, so a placeholder keeps `next build` working without a DB.
export const sql = neon(process.env.DATABASE_URL ?? "postgresql://user:pass@localhost/db");

export type Row = Record<string, any>;

export const num = (v: unknown): number => (v === null || v === undefined || v === "" ? 0 : Number(v));

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Audit-log insert, usable alone or inside sql.transaction([...]). */
export function auditQuery(userId: number | null, action: string, entity: string | null, entityId: number | null, details?: unknown) {
  return sql`INSERT INTO audit_log (user_id, action, entity, entity_id, details)
             VALUES (${userId}, ${action}, ${entity}, ${entityId}, ${details === undefined ? null : JSON.stringify(details)}::jsonb)`;
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await sql`SELECT key, value FROM settings`;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
