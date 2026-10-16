import Link from "next/link";
import { notFound } from "next/navigation";
import { BillActions } from "@/components/BillActions";
import { Icon } from "@/components/Icon";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { billText } from "@/lib/billText";
import { getSettings, num, sql } from "@/lib/db";
import { dateTime, money, waLink } from "@/lib/format";
import { pname, qtyUnit, unitLabel, type Key } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export default async function BillPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const { created } = await searchParams;
  const user = await requireUser();
  const { lang, t } = await getT();
  const [[b], items, settings] = await Promise.all([
    sql`SELECT b.*, u.name AS created_by_name, d.name AS delivered_by_name, c.area
        FROM bills b LEFT JOIN users u ON u.id = b.created_by LEFT JOIN users d ON d.id = b.delivered_by LEFT JOIN customers c ON c.id = b.customer_id
        WHERE b.id = ${id}`,
    sql`SELECT * FROM bill_items WHERE bill_id = ${id} ORDER BY id`,
    getSettings(),
  ]);
  if (!b) notFound();
  const due = num(b.total) - num(b.paid);

  return (
    <div className="space-y-4">
      {created && (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 p-3 font-semibold text-white">
          <Icon name="check" size={20} /> {t("billNo")} {b.bill_no} — saved / सेव हो गया
        </p>
      )}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="h1">
              {t("billNo")} {b.bill_no}
            </h1>
            <p className="muted">
              {dateTime(b.created_at)} · {t("createdBy")}: {b.created_by_name}
            </p>
          </div>
          <StatusBadge status={b.status} t={t} />
        </div>
        <div className="mt-3 space-y-1 rounded-2xl bg-ground p-3">
          {b.customer_id ? (
            <Link href={`/customers/${b.customer_id}`} className="text-[17px] font-semibold text-brand-600">
              {b.cust_name}
            </Link>
          ) : (
            <span className="font-semibold">{t("walkIn")}</span>
          )}
          {b.cust_phone && (
            <a href={`tel:${b.cust_phone}`} className="ml-2 inline-flex items-center gap-1 text-sm">
              <Icon name="phone" size={15} /> {b.cust_phone}
            </a>
          )}
          {b.cust_address && <p className="text-sm text-muted">{b.cust_address}</p>}
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon name={b.delivery === "home" ? "truck" : "store"} size={17} />
            {b.delivery === "home" ? t("home_delivery") : t("pickup")}
          </p>
          {b.notes && <p className="text-sm">{b.notes}</p>}
          {b.delivered_at && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
              <Icon name="check" size={17} /> {t("deliveredBy")}: {b.delivered_by_name} · {dateTime(b.delivered_at)}
            </p>
          )}
        </div>
      </div>

      <div className="card">
        {items.map((i) => (
          <div key={i.id} className="list-row">
            <div>
              <div className="font-semibold">{pname(i, lang)}</div>
              <div className="muted">
                {qtyUnit(i.qty, i.unit, lang)} × {money(i.price)}/{unitLabel(i.unit, lang)}
                {i.list_price !== null && Number(i.list_price) !== Number(i.price) && (
                  <span className="ml-1 text-purple-700">
                    ({t("listRate")} <s>{money(i.list_price)}</s>)
                  </span>
                )}
              </div>
            </div>
            <div className="amount text-lg">{money(i.amount)}</div>
          </div>
        ))}
        <div className="mt-2 space-y-1 border-t border-line pt-3">
          {num(b.discount) > 0 && (
            <div className="flex justify-between">
              <span>{t("discount")}</span>
              <span>−{money(b.discount)}</span>
            </div>
          )}
          <div className="amount flex justify-between text-2xl">
            <span>{t("total")}</span>
            <span>{money(b.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>
              {t("payment")}: {t(b.payment_mode as Key)}
            </span>
            <span>
              {t("paid")} {money(b.paid)}
            </span>
          </div>
          {due > 0 && b.status !== "cancelled" && (
            <div className="flex justify-between rounded-xl bg-red-50 px-3 py-2 font-bold text-red-700">
              <span>{t("due")}</span>
              <span>{money(due)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/print/bill/${id}`} className="btn-primary">
          <Icon name="print" size={20} /> {t("print")}
        </Link>
        <a href={waLink(b.cust_phone, billText(b, items, settings))} target="_blank" className="btn-green">
          <Icon name="chat" size={20} /> WhatsApp
        </a>
      </div>
      <BillActions id={id} status={b.status} isOwner={user.role === "owner"} lang={lang} />
    </div>
  );
}
