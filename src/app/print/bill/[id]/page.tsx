import { notFound } from "next/navigation";
import { PrintControls } from "@/components/PrintControls";
import { requireUser } from "@/lib/auth";
import { getSettings, num, sql } from "@/lib/db";
import { dateTime, money } from "@/lib/format";
import { hiName, qtyUnit, translator, type Key } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const WIDTH: Record<string, string> = { "58": "48mm", "80": "72mm", a5: "138mm", a4: "190mm" };
const hi = translator("hi");
const en = translator("en");
/** Bilingual label, Hindi first: "कुल / Total". */
const bi = (k: Key) => `${hi(k)} / ${en(k)}`;

export default async function PrintBill({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ size?: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sp = await searchParams;
  const size = WIDTH[sp.size ?? ""] ? sp.size! : "80";
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
      <PrintControls id={id} size={size} />
      <div className={`mx-auto bg-white p-2 text-black ${small ? "text-[12px] leading-tight" : "p-6 text-sm"}`} style={{ width: WIDTH[size] }}>
        <div className="text-center">
          <div className={`font-bold ${small ? "text-base" : "text-2xl"}`}>{s.shop_name_hi || s.shop_name}</div>
          {s.shop_name_hi && s.shop_name && <div className="font-semibold">{s.shop_name}</div>}
          {s.shop_address && <div>{s.shop_address}</div>}
          {s.shop_phone && <div>📞 {s.shop_phone}</div>}
          {s.gstin && <div>GSTIN: {s.gstin}</div>}
        </div>
        <div className="my-1 border-t border-dashed border-black" />
        <div className="flex justify-between font-semibold">
          <span>
            {bi("billNo")} {b.bill_no}
          </span>
        </div>
        <div>{dateTime(b.created_at)}</div>
        {b.status === "cancelled" && <div className="text-center font-bold">*** {bi("st_cancelled")} ***</div>}
        {b.cust_name && (
          <div>
            {bi("customer")}: <b>{b.cust_name}</b> {b.cust_phone}
          </div>
        )}
        {b.cust_address && (
          <div>
            {bi("address")}: {b.cust_address}
          </div>
        )}
        <div>{b.delivery === "home" ? "🛵 " + bi("home_delivery") : bi("pickup")}</div>
        {b.notes && <div>📝 {b.notes}</div>}
        <div className="my-1 border-t border-dashed border-black" />
        <table className="w-full">
          <thead>
            <tr className="text-left align-bottom">
              <th className="font-semibold">
                {hi("item")}
                <div className="text-[0.85em] font-normal">{en("item")}</div>
              </th>
              <th className="text-right font-semibold">
                {hi("qty")}
                <div className="text-[0.85em] font-normal">{en("qty")}</div>
              </th>
              <th className="text-right font-semibold">
                {hi("amount")}
                <div className="text-[0.85em] font-normal">{en("amount")}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-dotted border-stone-400 align-top">
                <td className="py-0.5">
                  <div className="font-semibold">{hiName(i)}</div>
                  <div className="text-[0.85em]">{i.name}</div>
                </td>
                <td className="whitespace-nowrap py-0.5 text-right">
                  {qtyUnit(i.qty, i.unit, "hi")}
                  <div className="text-[0.85em]">{qtyUnit(i.qty, i.unit, "en")}</div>
                </td>
                <td className="py-0.5 text-right">{money(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="my-1 border-t border-dashed border-black" />
        {num(b.discount) > 0 && (
          <>
            <Row label={bi("subtotal")} value={money(b.subtotal)} />
            <Row label={bi("discount")} value={"−" + money(b.discount)} />
          </>
        )}
        <Row label={bi("total")} value={money(b.total)} big />
        <Row label={`${bi("paid")} (${hi(b.payment_mode as Key)} / ${en(b.payment_mode as Key)})`} value={money(b.paid)} />
        {due > 0 && <Row label={bi("due")} value={money(due)} big />}
        <div className="my-1 border-t border-dashed border-black" />
        {s.bill_footer && <div className="text-center">{s.bill_footer}</div>}
        <div className="text-center">Thank you! Visit again.</div>
      </div>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${big ? "text-[1.15em] font-bold" : ""}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}
