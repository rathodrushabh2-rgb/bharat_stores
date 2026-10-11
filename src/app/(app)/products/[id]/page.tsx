import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ProductFields } from "@/components/ProductFields";
import { adjustStock, stockIn, updateProduct } from "@/app/actions/products";
import { requireUser } from "@/lib/auth";
import { num, sql } from "@/lib/db";
import { dateTime, money, qty } from "@/lib/format";
import { pname, unitLabel, type Key } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const user = await requireUser();
  const isOwner = user.role === "owner";
  const { lang, t } = await getT();
  const [[p], prices, moves, cats] = await Promise.all([
    sql`SELECT * FROM products WHERE id = ${id}`,
    sql`SELECT ph.*, u.name AS by FROM price_history ph LEFT JOIN users u ON u.id = ph.changed_by WHERE product_id = ${id} ORDER BY changed_at DESC LIMIT 20`,
    sql`SELECT sm.*, u.name AS by, b.bill_no FROM stock_moves sm LEFT JOIN users u ON u.id = sm.created_by LEFT JOIN bills b ON b.id = sm.bill_id
        WHERE product_id = ${id} ORDER BY sm.created_at DESC LIMIT 30`,
    sql`SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY 1`,
  ]);
  if (!p) notFound();
  const unit = unitLabel(p.unit, lang);
  const isLow = num(p.low_stock_at) > 0 && num(p.stock) <= num(p.low_stock_at);

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="h1">{pname(p, lang)}</h1>
        <p className="muted">{lang === "hi" ? p.name : p.name_hi}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-brand-50 p-3">
            <div className="muted">{t("price")}</div>
            <div className="text-xl font-bold">
              {money(p.price)}/{unit}
            </div>
          </div>
          <div className={`rounded-lg p-3 ${isLow ? "bg-red-50 text-red-700" : "bg-stone-50"}`}>
            <div className="muted">{t("stock")}</div>
            <div className="text-xl font-bold">
              {qty(p.stock)} {unit}
            </div>
          </div>
        </div>
      </div>

      <details className="card" open={false}>
        <summary className="h2 cursor-pointer">📥 {t("stockIn")}</summary>
        <ActionForm action={stockIn} className="mt-3 space-y-3" resetOnOk>
          <input type="hidden" name="id" value={id} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                {t("qty")} ({unit})
              </label>
              <input name="qty" type="number" step="0.001" min="0" inputMode="decimal" className="input" required />
            </div>
            {isOwner && (
              <div>
                <label className="label">{t("costPrice")}</label>
                <input name="cost_price" type="number" step="0.01" inputMode="decimal" className="input" defaultValue={p.cost_price ?? ""} />
              </div>
            )}
          </div>
          <input name="note" className="input" placeholder={t("notes")} />
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </details>

      {isOwner && (
        <>
          <details className="card">
            <summary className="h2 cursor-pointer">🔢 {t("stockAdjust")}</summary>
            <ActionForm action={adjustStock} className="mt-3 space-y-3" resetOnOk>
              <input type="hidden" name="id" value={id} />
              <label className="label">
                {t("countedStock")} ({unit})
              </label>
              <input name="counted" type="number" step="0.001" inputMode="decimal" className="input" required />
              <input name="note" className="input" placeholder={t("notes")} />
              <SubmitButton>{t("save")}</SubmitButton>
            </ActionForm>
          </details>

          <details className="card">
            <summary className="h2 cursor-pointer">✏️ {t("edit")}</summary>
            <ActionForm action={updateProduct} className="mt-3 space-y-4">
              <input type="hidden" name="id" value={id} />
              <ProductFields p={p} t={t} lang={lang} />
              <datalist id="categories">
                {cats.map((c) => (
                  <option key={c.category} value={c.category} />
                ))}
              </datalist>
              <SubmitButton>{t("save")}</SubmitButton>
            </ActionForm>
          </details>
        </>
      )}

      <section className="card">
        <h2 className="h2 mb-2">{t("stockHistory")}</h2>
        {moves.length === 0 && <p className="muted">{t("none")}</p>}
        {moves.map((m) => (
          <div key={m.id} className="list-row text-sm">
            <div>
              <div>
                {t(`r_${m.reason}` as Key)}
                {m.bill_no ? ` #${m.bill_no}` : ""} {m.note ? `· ${m.note}` : ""}
              </div>
              <div className="muted">
                {dateTime(m.created_at)} · {m.by}
              </div>
            </div>
            <div className={`font-semibold ${num(m.qty) < 0 ? "text-red-600" : "text-green-700"}`}>
              {num(m.qty) > 0 ? "+" : ""}
              {qty(m.qty)}
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="h2 mb-2">{t("priceHistory")}</h2>
        {prices.map((h) => (
          <div key={h.id} className="list-row text-sm">
            <div className="muted">
              {dateTime(h.changed_at)} · {h.by}
            </div>
            <div>
              {h.old_price !== null && <span className="text-stone-400 line-through">{money(h.old_price)}</span>} <b>{money(h.new_price)}</b>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
