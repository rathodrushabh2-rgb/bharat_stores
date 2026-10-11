import { notFound } from "next/navigation";
import { PrintControls } from "@/components/PrintControls";
import { requireUser } from "@/lib/auth";
import { getSettings, num, sql } from "@/lib/db";
import { dateTime, money, qty } from "@/lib/format";
import { pname, translator, unitLabel, type Key } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const WIDTH: Record<string, string> = { "58": "48mm", "80": "72mm", a5: "138mm", a4: "190mm" };

export default async function PrintBill({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ size?: string; lang?: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sp = await searchParams;
  const size = WIDTH[sp.size ?? ""] ? sp.size! : "80";
  const lang = sp.lang === "en" ? "en" : "hi"; // bills print in Hindi by default
  const t = translator(lang);
  const [[b], items, s] = await Promise.all([
    sql`SELECT * FROM bills WHERE id = ${id}`,
    sql`SELECT * FROM bill_items WHERE bill_id = ${id} ORDER BY id`,
    getSettings(),
  ]);
  if (!b) notFound();
  const small = size === "58" || size === "80";
  const due = num(b.total) - num(b.paid);

  return (
    <div className="min-h-screen bg-stone-200 py-2 print:bg-white print:py-0">
      <style>{`@page { size: ${small ? `${size}mm auto` : size.toUpperCase()}; margin: ${small ? "2mm" : "10mm"}; }`}</style>
      <PrintControls id={id} size={size} lang={lang} />
      <div className={`mx-auto bg-white p-2 text-black ${small ? "text-[12px] leading-tight" : "p-6 text-sm"}`} style={{ width: WIDTH[size] }}>
        <div className="text-center">
          <div className={`font-bold ${small ? "text-base" : "text-2xl"}`}>{lang === "hi" ? s.shop_name_hi || s.shop_name : s.shop_name}</div>
          {s.shop_address && <div>{s.shop_address}</div>}
          {s.shop_phone && <div>📞 {s.shop_phone}</div>}
          {s.gstin && <div>GSTIN: {s.gstin}</div>}
        </div>
        <div className="my-1 border-t border-dashed border-black" />
        <div className="flex justify-between font-semibold">
          <span>
            {t("billNo")} {b.bill_no}
          </span>
          <span>{dateTime(b.created_at)}</span>
        </div>
        {b.status === "cancelled" && <div className="text-center font-bold">*** {t("st_cancelled")} ***</div>}
        {b.cust_name && (
          <div>
            {t("customer")}: <b>{b.cust_name}</b> {b.cust_phone}
          </div>
        )}
        {b.cust_address && (
          <div>
            {t("address")}: {b.cust_address}
          </div>
        )}
        <div>{b.delivery === "home" ? "🛵 " + t("home_delivery") : t("pickup")}</div>
        {b.notes && <div>📝 {b.notes}</div>}
        <div className="my-1 border-t border-dashed border-black" />
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="font-semibold">{t("item")}</th>
              <th className="text-right font-semibold">{t("qty")}</th>
              {!small && <th className="text-right font-semibold">{t("rate")}</th>}
              <th className="text-right font-semibold">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="align-top">
                <td className="py-0.5">
                  {pname(i, lang)}
                  {small && (
                    <div className="text-[10px]">
                      @{money(i.price)}/{unitLabel(i.unit, lang)}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap text-right">
                  {qty(i.qty)} {unitLabel(i.unit, lang)}
                </td>
                {!small && <td className="text-right">{money(i.price)}</td>}
                <td className="text-right">{money(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="my-1 border-t border-dashed border-black" />
        {num(b.discount) > 0 && (
          <>
            <Row label={t("subtotal")} value={money(b.subtotal)} />
            <Row label={t("discount")} value={"−" + money(b.discount)} />
          </>
        )}
        <Row label={t("total")} value={money(b.total)} big />
        <Row label={`${t("paid")} (${t(b.payment_mode as Key)})`} value={money(b.paid)} />
        {due > 0 && <Row label={t("due")} value={money(due)} big />}
        <div className="my-1 border-t border-dashed border-black" />
        {s.bill_footer && <div className="text-center">{s.bill_footer}</div>}
      </div>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={`flex justify-between ${big ? "text-[1.15em] font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
