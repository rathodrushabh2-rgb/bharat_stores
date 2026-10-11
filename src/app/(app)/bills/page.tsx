import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { num, sql } from "@/lib/db";
import { dateTime, money } from "@/lib/format";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/lang";

const TABS = ["new", "packed", "delivered", "credit", "all"] as const;

export default async function BillsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = (TABS as readonly string[]).includes(sp.status ?? "") ? sp.status! : "new";
  const q = (sp.q ?? "").trim();
  const { t } = await getT();
  const like = `%${q}%`;
  const rows = await sql`
    SELECT b.id, b.bill_no, b.cust_name, b.status, b.total, b.paid, b.payment_mode, b.delivery, b.source, b.created_at,
           (SELECT count(*) FROM bill_items i WHERE i.bill_id = b.id)::int AS n
    FROM bills b
    WHERE CASE ${status}
            WHEN 'all' THEN true
            WHEN 'credit' THEN b.status <> 'cancelled' AND b.paid < b.total
            ELSE b.status = ${status} END
      AND (${q} = '' OR b.cust_name ILIKE ${like} OR b.cust_phone ILIKE ${like} OR b.bill_no::text = ${q})
    ORDER BY b.id ${status === "new" || status === "packed" ? sql.unsafe("ASC") : sql.unsafe("DESC")} LIMIT 200`;
  const label = (s: string) => (s === "all" ? t("all") : s === "credit" ? t("credit") : t(`st_${s}` as Key));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="h1">{t("bills")}</h1>
        <Link href="/bills/new" className="btn-primary btn-sm">
          + {t("newBill")}
        </Link>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((s) => (
          <Link key={s} href={`/bills?status=${s}`} className={`btn btn-sm whitespace-nowrap ${s === status ? "bg-brand-600 text-white" : "bg-white ring-1 ring-stone-300"}`}>
            {label(s)}
          </Link>
        ))}
      </div>
      <form className="flex gap-2">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={q} placeholder={`${t("billNo")} / ${t("customer")}`} className="input" />
        <button className="btn-secondary">{t("search")}</button>
      </form>
      <div className="space-y-2">
        {rows.length === 0 && <p className="card muted">{t("none")}</p>}
        {rows.map((b) => (
          <Link key={b.id} href={`/bills/${b.id}`} className="card flex items-center justify-between gap-2 py-3">
            <div>
              <div className="font-semibold">
                #{b.bill_no} · {b.cust_name ?? t("walkIn")}
              </div>
              <div className="muted">
                {dateTime(b.created_at)} · {b.n} {t("item")}
                {b.delivery === "home" && " · 🛵"}
                {b.source === "whatsapp" && " · 💬"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{money(b.total)}</div>
              <div className="space-x-1">
                {num(b.paid) < num(b.total) && b.status !== "cancelled" && <span className="badge bg-red-100 text-red-700">{t("credit")}</span>}
                <StatusBadge status={b.status} t={t} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
