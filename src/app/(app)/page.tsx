import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { num, sql } from "@/lib/db";
import { dateTime, money, qty } from "@/lib/format";
import { pname, unitLabel } from "@/lib/i18n";
import { getT } from "@/lib/lang";

const TODAY = sql.unsafe("(date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')");

export default async function Dashboard() {
  const { lang, t } = await getT();
  const [[today], [queue], [due], low, recent] = await Promise.all([
    sql`SELECT coalesce(sum(total), 0) AS total, count(*)::int AS n, coalesce(sum(paid), 0) AS paid
        FROM bills WHERE status <> 'cancelled' AND created_at >= ${TODAY}`,
    sql`SELECT count(*) FILTER (WHERE status = 'new')::int AS new, count(*) FILTER (WHERE status = 'packed')::int AS packed FROM bills`,
    sql`SELECT coalesce(sum(d), 0) AS total FROM (SELECT sum(amount) AS d FROM ledger GROUP BY customer_id HAVING sum(amount) > 0) x`,
    sql`SELECT id, name, name_hi, unit, stock FROM products WHERE active AND low_stock_at > 0 AND stock <= low_stock_at ORDER BY stock LIMIT 8`,
    sql`SELECT id, bill_no, cust_name, total, status, created_at FROM bills ORDER BY id DESC LIMIT 5`,
  ]);
  return (
    <div className="space-y-4">
      <Link href="/bills/new" className="btn-primary w-full py-4 text-lg shadow">
        + {t("newBill")}
      </Link>
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="muted">{t("todaySales")}</div>
          <div className="text-2xl font-bold">{money(today.total)}</div>
          <div className="muted">
            {today.n} {t("billsCount")} · {t("paid")} {money(today.paid)}
          </div>
        </div>
        <Link href="/udhaar" className="card">
          <div className="muted">{t("totalDue")}</div>
          <div className="text-2xl font-bold text-red-600">{money(due.total)}</div>
          <div className="muted">→ {t("udhaarList")}</div>
        </Link>
        <Link href="/bills?status=new" className={`card ${queue.new ? "ring-2 ring-amber-400" : ""}`}>
          <div className="muted">{t("toPack")}</div>
          <div className="text-2xl font-bold text-amber-600">{queue.new}</div>
        </Link>
        <Link href="/bills?status=packed" className="card">
          <div className="muted">{t("toDeliver")}</div>
          <div className="text-2xl font-bold text-blue-600">{queue.packed}</div>
        </Link>
      </div>

      {low.length > 0 && (
        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="h2 text-red-600">⚠ {t("lowStock")}</h2>
            <Link href="/products?low=1" className="text-sm text-brand-700 underline">
              {t("all")} →
            </Link>
          </div>
          {low.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`} className="list-row">
              <span>{pname(p, lang)}</span>
              <span className="font-semibold text-red-600">
                {qty(p.stock)} {unitLabel(p.unit, lang)}
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="card">
        <h2 className="h2 mb-2">{t("recentBills")}</h2>
        {recent.length === 0 && <p className="muted">{t("none")}</p>}
        {recent.map((b) => (
          <Link key={b.id} href={`/bills/${b.id}`} className="list-row">
            <div>
              <div className="font-medium">
                #{b.bill_no} · {b.cust_name ?? t("walkIn")}
              </div>
              <div className="muted">{dateTime(b.created_at)}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{money(num(b.total))}</div>
              <StatusBadge status={b.status} t={t} />
            </div>
          </Link>
        ))}
      </section>
      <p className="muted text-center">{t("installHint")}</p>
    </div>
  );
}
