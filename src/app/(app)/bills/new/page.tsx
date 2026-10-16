import { BillForm } from "@/components/BillForm";
import { requireUser } from "@/lib/auth";
import { getSettings, num, sql } from "@/lib/db";
import { waPhone } from "@/lib/format";
import { ruleFromSettings } from "@/lib/pricing";
import { getT } from "@/lib/lang";

export default async function NewBillPage({ searchParams }: { searchParams: Promise<{ customer?: string; wa?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const { lang, t } = await getT();
  const [products, customers, waRows, settings, frequent] = await Promise.all([
    sql`SELECT id, name, name_hi, unit, price, stock FROM products WHERE active ORDER BY name`,
    sql`SELECT c.id, c.name, c.phone, c.address, c.area, coalesce(sum(l.amount), 0) AS due
        FROM customers c LEFT JOIN ledger l ON l.customer_id = c.id GROUP BY c.id ORDER BY c.name`,
    sp.wa ? sql`SELECT id, body, from_name, from_phone FROM wa_messages WHERE id = ${Number(sp.wa)} AND status = 'new'` : Promise.resolve([]),
    getSettings(),
    // Best sellers of the last 60 days for the quick-add chips.
    sql`SELECT bi.product_id FROM bill_items bi JOIN bills b ON b.id = bi.bill_id JOIN products p ON p.id = bi.product_id
        WHERE b.created_at > now() - interval '60 days' AND b.status <> 'cancelled' AND p.active
        GROUP BY bi.product_id ORDER BY count(*) DESC LIMIT 10`,
  ]);
  const wa = waRows[0] ?? null;
  let initialCustomerId = sp.customer ? Number(sp.customer) : null;
  if (wa && !initialCustomerId && wa.from_phone) {
    // Match the WhatsApp sender to a saved customer by the last 10 digits of the phone.
    const last10 = waPhone(wa.from_phone).slice(-10);
    initialCustomerId = customers.find((c) => c.phone && waPhone(c.phone).slice(-10) === last10)?.id ?? null;
  }
  return (
    <div>
      <h1 className="h1 mb-3">{t("newBill")}</h1>
      <BillForm
        products={products.map((p) => ({ id: p.id, name: p.name, name_hi: p.name_hi, unit: p.unit, price: num(p.price), stock: num(p.stock) }))}
        frequent={frequent.length ? frequent.map((f) => f.product_id) : products.slice(0, 8).map((p) => p.id)}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, address: c.address, area: c.area, due: num(c.due) }))}
        isOwner={user.role === "owner"}
        canEditRate={user.role === "owner" || settings.staff_can_edit_rate === "1"}
        rule={ruleFromSettings(settings)}
        lang={lang}
        initialCustomerId={initialCustomerId}
        wa={wa as any}
      />
    </div>
  );
}
