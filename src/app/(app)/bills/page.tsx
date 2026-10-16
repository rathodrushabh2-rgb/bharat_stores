import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusButton } from "@/components/StatusButton";
import { num, sql } from "@/lib/db";
import { dateTime, money } from "@/lib/format";
import { pname, qtyUnit, type Key } from "@/lib/i18n";
import { getT } from "@/lib/lang";

const TABS = ["new", "packed", "delivered", "credit", "all"] as const;

export default async function BillsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = (TABS as readonly string[]).includes(sp.status ?? "") ? sp.status! : "new";
  const q = (sp.q ?? "").trim();
  const { lang, t } = await getT();
  const like = `%${q}%`;
  const [rows, [counts]] = await Promise.all([
    sql`
      SELECT b.id, b.bill_no, b.cust_name, b.cust_address, b.status, b.total, b.paid, b.payment_mode, b.delivery, b.source, b.created_at,
             coalesce((SELECT json_agg(json_build_object('name', i.name, 'name_hi', i.name_hi, 'qty', i.qty, 'unit', i.unit) ORDER BY i.id)
                       FROM bill_items i WHERE i.bill_id = b.id), '[]') AS items
      FROM bills b
      WHERE CASE ${status}
              WHEN 'all' THEN true
              WHEN 'credit' THEN b.status <> 'cancelled' AND b.paid < b.total
              ELSE b.status = ${status} END
        AND (${q} = '' OR b.cust_name ILIKE ${like} OR b.cust_phone ILIKE ${like} OR b.bill_no::text = ${q})
      ORDER BY b.id ${status === "new" || status === "packed" ? sql.unsafe("ASC") : sql.unsafe("DESC")} LIMIT 200`,
    sql`SELECT count(*) FILTER (WHERE status = 'new')::int AS new, count(*) FILTER (WHERE status = 'packed')::int AS packed FROM bills`,
  ]);
  const label = (s: string) => (s === "all" ? t("all") : s === "credit" ? t("credit") : t(`st_${s}` as Key));
  const count = (s: string) => (s === "new" ? counts.new : s === "packed" ? counts.packed : null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">{t("orders")}</h1>
        <span className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
          {t("live")}
        </span>
      </div>

      <nav className="seg -mx-1 flex gap-1 overflow-x-auto">
        {TABS.map((s) => (
          <Link key={s} href={`/bills?status=${s}`} className={`seg-btn flex shrink-0 grow items-center justify-center whitespace-nowrap px-3 ${s === status ? "seg-on" : ""}`}>
            {label(s)}
            {count(s) ? ` · ${count(s)}` : ""}
          </Link>
        ))}
      </nav>

      <form className="flex gap-2">
        <input type="hidden" name="status" value={status} />
        <label className="input flex items-center gap-2">
          <Icon name="search" size={20} className="text-muted" />
          <input name="q" defaultValue={q} placeholder={`${t("billNo")} / ${t("customer")}`} className="w-full bg-transparent outline-none" />
        </label>
      </form>

      {rows.length === 0 && <p className="card muted">{t("none")}</p>}
      {rows.map((b) => {
        const due = num(b.total) - num(b.paid);
        const items = b.items as { name: string; name_hi: string | null; qty: string; unit: string }[];
        return (
          <article key={b.id} className={`card space-y-3 ${b.status === "new" ? "ring-2 ring-green-600/70" : ""}`}>
            <Link href={`/bills/${b.id}`} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="amount text-[22px] font-extrabold leading-tight">#{b.bill_no}</div>
                <div className="truncate text-[17px] font-semibold">{b.cust_name ?? t("walkIn")}</div>
                <div className="truncate text-sm text-muted">
                  {b.cust_address ? `${b.cust_address} · ` : ""}
                  {dateTime(b.created_at)}
                  {b.source === "whatsapp" ? " · WhatsApp" : ""}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="amount text-[22px]">{money(b.total)}</span>
                {b.status !== "cancelled" &&
                  (due > 0 ? (
                    <span className="badge bg-red-50 text-red-700">
                      {t("credit")} {money(due)}
                    </span>
                  ) : (
                    <span className="badge bg-green-50 text-green-700">
                      {t(b.payment_mode as Key)} {t("paid")}
                    </span>
                  ))}
                {(b.status === "delivered" || b.status === "cancelled") && <StatusBadge status={b.status} t={t} />}
              </div>
            </Link>
            {(b.status === "new" || b.status === "packed") && (
              <>
                <div className="space-y-1 rounded-2xl bg-ground px-3 py-2.5 text-[15px]">
                  {items.slice(0, 6).map((i, n) => (
                    <div key={n} className="flex justify-between gap-2">
                      <span className="truncate">{pname(i, lang)}</span>
                      <span className="shrink-0 font-semibold">{qtyUnit(i.qty, i.unit, lang)}</span>
                    </div>
                  ))}
                  {items.length > 6 && <div className="text-muted">+{items.length - 6}</div>}
                </div>
                <div className="flex items-center gap-2 text-sm text-[#3D4552]">
                  <Icon name={b.delivery === "home" ? "truck" : "store"} size={18} />
                  {b.delivery === "home" ? t("home_delivery") : t("pickup")}
                </div>
                <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                  <Link href={`/print/bill/${b.id}`} className="btn-secondary">
                    <Icon name="print" size={20} />
                    {t("print")}
                  </Link>
                  {b.status === "new" ? (
                    <StatusButton id={b.id} to="packed" label={t("markPacked")} />
                  ) : (
                    <StatusButton id={b.id} to="delivered" label={t("markDelivered")} />
                  )}
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
