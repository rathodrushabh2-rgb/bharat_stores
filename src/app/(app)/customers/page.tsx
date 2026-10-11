import Link from "next/link";
import { num, sql } from "@/lib/db";
import { money } from "@/lib/format";
import { getT } from "@/lib/lang";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { t } = await getT();
  const like = `%${q.trim()}%`;
  const rows = await sql`
    SELECT c.id, c.name, c.phone, c.area, coalesce(sum(l.amount), 0) AS due
    FROM customers c LEFT JOIN ledger l ON l.customer_id = c.id
    WHERE (${q.trim()} = '' OR c.name ILIKE ${like} OR c.phone ILIKE ${like} OR c.area ILIKE ${like})
    GROUP BY c.id ORDER BY c.name LIMIT 500`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="h1">{t("customers")}</h1>
        <Link href="/customers/new" className="btn-primary btn-sm">
          + {t("add")}
        </Link>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("searchCustomers")} className="input" />
        <button className="btn-secondary">{t("search")}</button>
      </form>
      <div className="card p-0">
        {rows.length === 0 && <p className="muted p-4">{t("none")}</p>}
        {rows.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="list-row px-4">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="muted">{[c.phone, c.area].filter(Boolean).join(" · ")}</div>
            </div>
            {num(c.due) > 0 && <div className="font-bold text-red-600">{money(c.due)}</div>}
            {num(c.due) < 0 && <div className="font-semibold text-green-700">+{money(-num(c.due))}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
