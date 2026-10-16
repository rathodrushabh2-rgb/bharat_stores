import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { StatusButton } from "@/components/StatusButton";
import { getUser } from "@/lib/auth";
import { num, sql } from "@/lib/db";
import { money } from "@/lib/format";
import { pname, qtyUnit } from "@/lib/i18n";
import { getT } from "@/lib/lang";

const TODAY = sql.unsafe("(date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')");

export default async function Dashboard() {
  const user = (await getUser())!;
  const { lang, t } = await getT();
  const [[today], toPack, [due], topDues, low] = await Promise.all([
    sql`SELECT coalesce(sum(total), 0) AS total, count(*)::int AS n, coalesce(sum(paid), 0) AS paid
        FROM bills WHERE status <> 'cancelled' AND created_at >= ${TODAY}`,
    sql`SELECT b.id, b.bill_no, b.cust_name, b.total, b.delivery,
               (SELECT count(*) FROM bill_items i WHERE i.bill_id = b.id)::int AS n
        FROM bills b WHERE status = 'new' ORDER BY id LIMIT 10`,
    sql`SELECT coalesce(sum(d), 0) AS total FROM (SELECT sum(amount) AS d FROM ledger GROUP BY customer_id HAVING sum(amount) > 0) x`,
    sql`SELECT c.id, c.name, sum(l.amount) AS due,
               extract(day FROM now() - max(l.created_at) FILTER (WHERE l.kind = 'payment'))::int AS days
        FROM customers c JOIN ledger l ON l.customer_id = c.id
        GROUP BY c.id HAVING sum(l.amount) > 0 ORDER BY sum(l.amount) DESC LIMIT 3`,
    sql`SELECT id, name, name_hi, unit, stock FROM products WHERE active AND low_stock_at > 0 AND stock <= low_stock_at ORDER BY stock LIMIT 8`,
  ]);
  const dateLabel = new Date().toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long" });
  const actions: { href: string; label: string; icon: IconName; tint: string }[] = [
    { href: "/bills/new", label: t("newBill"), icon: "plus", tint: "bg-brand-100 text-brand-600" },
    { href: "/udhaar", label: t("qaPayment"), icon: "cash", tint: "bg-green-50 text-green-600" },
    { href: "/products", label: t("qaStock"), icon: "box", tint: "bg-blue-50 text-blue-600" },
    user.role === "owner"
      ? { href: "/products/prices", label: t("qaPrices"), icon: "tag", tint: "bg-purple-50 text-purple-600" }
      : { href: "/whatsapp", label: "WhatsApp", icon: "chat", tint: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Today */}
      <section className="rounded-[24px] bg-brand-600 p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="font-medium">{t("todaySales")}</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm">{dateLabel}</span>
        </div>
        <div className="amount mt-2 text-[44px] font-extrabold leading-none">{money(today.total)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [t("bills"), String(today.n)],
            [t("cashUpi"), money(today.paid)],
            [t("credit"), money(num(today.total) - num(today.paid))],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/15 px-3 py-2">
              <div className="text-[13px]">{k}</div>
              <div className="amount truncate text-lg">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-4 gap-2.5">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2 rounded-[20px] bg-white px-1 py-3.5 active:scale-95">
            <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${a.tint}`}>
              <Icon name={a.icon} />
            </span>
            <span className="text-center text-[13px] font-semibold leading-tight">{a.label}</span>
          </Link>
        ))}
      </section>

      {/* To pack */}
      <section>
        <div className="mb-2.5 flex items-baseline justify-between px-1">
          <h2 className="h2 text-xl">
            {t("toPack")} <span className="ml-1 rounded-full bg-amber-100 px-2.5 text-base text-amber-700">{toPack.length}</span>
          </h2>
          <Link href="/bills?status=new" className="text-[15px] font-semibold text-brand-600">
            {t("seeAll")}
          </Link>
        </div>
        {toPack.length === 0 ? (
          <p className="card muted">{t("none")}</p>
        ) : (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {toPack.map((b) => (
              <div key={b.id} className="card flex w-[250px] shrink-0 snap-start flex-col gap-2.5">
                <Link href={`/bills/${b.id}`} className="font-display text-lg font-bold leading-tight">
                  #{b.bill_no} · {b.cust_name ?? t("walkIn")}
                </Link>
                <span className="muted">
                  {b.n} {t("itemsCount")} · {b.delivery === "home" ? t("home_delivery") : t("pickup")} · {money(b.total)}
                </span>
                <div className="flex gap-2">
                  <StatusButton id={b.id} to="packed" label={t("markPacked")} />
                  <Link href={`/print/bill/${b.id}`} aria-label={t("print")} className="btn-secondary w-12 px-0">
                    <Icon name="print" size={20} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Udhaar */}
      <section className="card space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="muted text-[15px]">{t("totalDue")}</div>
            <div className="amount text-[32px] font-extrabold leading-tight text-red-600">{money(due.total)}</div>
          </div>
          <Link href="/udhaar" className="text-[15px] font-semibold text-brand-600">
            {t("udhaarList")}
          </Link>
        </div>
        {topDues.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center justify-between border-t border-ground pt-3">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">{c.name.trim().charAt(0)}</span>
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-[13px] text-muted">
                  {c.days === null ? "—" : `${t("lastPaid")} ${c.days === 0 ? t("today") : `${c.days} ${t("daysAgo")}`}`}
                </span>
              </span>
            </span>
            <span className="amount text-lg text-red-600">{money(c.due)}</span>
          </Link>
        ))}
      </section>

      {/* Low stock */}
      {low.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-baseline justify-between px-1">
            <h2 className="h2 text-xl">{t("lowStock")}</h2>
            <Link href="/products?low=1" className="text-[15px] font-semibold text-brand-600">
              {t("seeAll")}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {low.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="chip ring-red-100">
                {pname(p, lang)} · <b className="text-red-600">{qtyUnit(p.stock, p.unit, lang)}</b>
              </Link>
            ))}
          </div>
        </section>
      )}
      <p className="muted px-2 text-center">{t("installHint")}</p>
    </div>
  );
}
