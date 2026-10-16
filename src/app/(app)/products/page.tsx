import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Icon } from "@/components/Icon";
import { fillMissingHindi } from "@/app/actions/products";
import { getUser } from "@/lib/auth";
import { num, sql } from "@/lib/db";
import { money } from "@/lib/format";
import { pname, qtyUnit, unitLabel } from "@/lib/i18n";
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
  const [{ missing }] = await sql`SELECT count(*)::int AS missing FROM products WHERE name_hi IS NULL OR btrim(name_hi) = ''`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="h1">{t("products")}</h1>
        {user.role === "owner" && (
          <Link href="/products/new" className="btn-primary btn-sm">
            <Icon name="plus" size={18} /> {t("add")}
          </Link>
        )}
      </div>
      {user.role === "owner" && (
        <div className="grid grid-cols-2 gap-2">
          <Link href="/products/prices" className="btn-secondary btn-sm min-h-[44px]">
            <Icon name="tag" size={18} className="text-purple-600" /> {t("priceList")}
          </Link>
          <Link href="/products/upload" className="btn-secondary btn-sm min-h-[44px]">
            <Icon name="upload" size={18} className="text-blue-600" /> {t("uploadRates")}
          </Link>
        </div>
      )}
      {user.role === "owner" && missing > 0 && (
        <ActionForm action={fillMissingHindi}>
          <SubmitButton className="btn-secondary btn-sm w-full">
            ✨ {t("fillHindi")} ({missing})
          </SubmitButton>
        </ActionForm>
      )}
      <form>
        {low && <input type="hidden" name="low" value="1" />}
        <label className="input flex items-center gap-2">
          <Icon name="search" size={20} className="shrink-0 text-muted" />
          <input name="q" defaultValue={q} placeholder={t("searchProducts")} className="w-full bg-transparent outline-none" />
        </label>
      </form>
      <div className="flex gap-2 text-sm">
        <Link href="/products" className={`chip ${!low ? "!bg-ink text-white ring-ink" : ""}`}>
          {t("all")}
        </Link>
        <Link href="/products?low=1" className={`chip ${low ? "!bg-red-600 text-white ring-red-600" : ""}`}>
          <Icon name="alert" size={16} /> {t("onlyLow")}
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
                  {t("stock")}: {qtyUnit(p.stock, p.unit, lang)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
