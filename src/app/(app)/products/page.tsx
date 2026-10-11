import Link from "next/link";
import { getUser } from "@/lib/auth";
import { num, sql } from "@/lib/db";
import { money, qty } from "@/lib/format";
import { pname, unitLabel } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  const { q = "", low } = await searchParams;
  const user = (await getUser())!;
  const { lang, t } = await getT();
  const like = `%${q.trim()}%`;
  const rows = await sql`
    SELECT id, name, name_hi, unit, price, stock, low_stock_at, active, category FROM products
    WHERE (${q.trim()} = '' OR name ILIKE ${like} OR name_hi ILIKE ${like} OR category ILIKE ${like})
      AND (${!!low} = false OR (low_stock_at > 0 AND stock <= low_stock_at))
    ORDER BY active DESC, name LIMIT 500`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="h1">{t("products")}</h1>
        {user.role === "owner" && (
          <div className="flex gap-2">
            <Link href="/products/prices" className="btn-secondary btn-sm">
              ₹ {t("priceList")}
            </Link>
            <Link href="/products/new" className="btn-primary btn-sm">
              + {t("add")}
            </Link>
          </div>
        )}
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("searchProducts")} className="input" />
        <button className="btn-secondary">{t("search")}</button>
      </form>
      <div className="flex gap-2 text-sm">
        <Link href="/products" className={`badge ${!low ? "bg-brand-600 text-white" : "bg-white ring-1 ring-stone-300"}`}>
          {t("all")}
        </Link>
        <Link href="/products?low=1" className={`badge ${low ? "bg-red-600 text-white" : "bg-white ring-1 ring-stone-300"}`}>
          ⚠ {t("onlyLow")}
        </Link>
      </div>
      <div className="card p-0">
        {rows.length === 0 && <p className="muted p-4">{t("none")}</p>}
        {rows.map((p) => {
          const isLow = num(p.low_stock_at) > 0 && num(p.stock) <= num(p.low_stock_at);
          return (
            <Link key={p.id} href={`/products/${p.id}`} className={`list-row px-4 ${p.active ? "" : "opacity-40"}`}>
              <div>
                <div className="font-semibold">{pname(p, lang)}</div>
                <div className="muted">{lang === "hi" ? p.name : p.name_hi}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {money(p.price)} <span className="muted">/{unitLabel(p.unit, lang)}</span>
                </div>
                <div className={`text-sm ${isLow ? "font-bold text-red-600" : "text-stone-500"}`}>
                  {t("stock")}: {qty(p.stock)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
