import { UNITS, type Key, type Lang } from "@/lib/i18n";
import type { Row } from "@/lib/db";
import { NameFields } from "./NameFields";

export function ProductFields({ p, t, lang, isNew }: { p?: Row; t: (k: Key) => string; lang: Lang; isNew?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <NameFields name={p?.name ?? ""} nameHi={p?.name_hi ?? ""} labels={{ name: t("name"), nameHi: t("nameHi"), auto: t("autoTranslated") }} />
      <div>
        <label className="label">{t("price")} (₹) *</label>
        <input name="price" type="number" step="0.01" min="0" inputMode="decimal" className="input" defaultValue={p?.price} required />
      </div>
      <div>
        <label className="label">{t("unit")}</label>
        <select name="unit" className="input" defaultValue={p?.unit ?? "kg"}>
          {Object.entries(UNITS).map(([k, v]) => (
            <option key={k} value={k}>
              {v[lang]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t("costPrice")} (₹)</label>
        <input name="cost_price" type="number" step="0.01" min="0" inputMode="decimal" className="input" defaultValue={p?.cost_price ?? ""} />
      </div>
      <div>
        <label className="label">{t("category")}</label>
        <input name="category" className="input" defaultValue={p?.category ?? ""} list="categories" />
      </div>
      {isNew && (
        <div>
          <label className="label">{t("openingStock")}</label>
          <input name="stock" type="number" step="0.001" inputMode="decimal" className="input" defaultValue="0" />
        </div>
      )}
      <div>
        <label className="label">{t("lowStockAt")}</label>
        <input name="low_stock_at" type="number" step="0.001" min="0" inputMode="decimal" className="input" defaultValue={p?.low_stock_at ?? 0} />
      </div>
      {!isNew && (
        <label className="col-span-2 flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={p?.active} className="h-5 w-5" /> {t("active")}
        </label>
      )}
    </div>
  );
}
