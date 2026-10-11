import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { updatePrices } from "@/app/actions/products";
import { requireOwner } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pname, unitLabel } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export default async function PriceListPage() {
  await requireOwner();
  const { lang, t } = await getT();
  const rows = await sql`SELECT id, name, name_hi, unit, price, category FROM products WHERE active ORDER BY category NULLS LAST, name`;
  return (
    <div className="space-y-3">
      <h1 className="h1">₹ {t("priceList")}</h1>
      <ActionForm action={updatePrices} className="space-y-3">
        <div className="card p-0">
          {rows.map((p) => (
            <label key={p.id} className="list-row px-4">
              <span>
                <span className="font-semibold">{pname(p, lang)}</span>
                <span className="muted"> /{unitLabel(p.unit, lang)}</span>
              </span>
              <input name={`price_${p.id}`} type="number" step="0.01" min="0" inputMode="decimal" defaultValue={p.price} className="input w-28 text-right" />
            </label>
          ))}
        </div>
        <div className="sticky bottom-20">
          <SubmitButton>{t("saveChanged")}</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
