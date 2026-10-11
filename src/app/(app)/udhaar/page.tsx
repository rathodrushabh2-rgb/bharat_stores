import Link from "next/link";
import { sql } from "@/lib/db";
import { date, money } from "@/lib/format";
import { getT } from "@/lib/lang";

export default async function UdhaarPage() {
  const { t } = await getT();
  const rows = await sql`
    SELECT c.id, c.name, c.phone, c.area, sum(l.amount) AS due, max(l.created_at) FILTER (WHERE l.kind = 'payment') AS last_paid
    FROM customers c JOIN ledger l ON l.customer_id = c.id
    GROUP BY c.id HAVING sum(l.amount) > 0 ORDER BY sum(l.amount) DESC`;
  const total = rows.reduce((s, r) => s + Number(r.due), 0);
  return (
    <div className="space-y-3">
      <h1 className="h1">{t("udhaarList")}</h1>
      <div className="card flex items-center justify-between bg-red-50">
        <span className="font-semibold">{t("totalDue")}</span>
        <span className="text-2xl font-bold text-red-700">{money(total)}</span>
      </div>
      <div className="card p-0">
        {rows.length === 0 && <p className="muted p-4">{t("noDue")}</p>}
        {rows.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="list-row px-4">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="muted">
                {[c.phone, c.area].filter(Boolean).join(" · ")}
                {c.last_paid && ` · ${t("paid")}: ${date(c.last_paid)}`}
              </div>
            </div>
            <div className="font-bold text-red-600">{money(c.due)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
