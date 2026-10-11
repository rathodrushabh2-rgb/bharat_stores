import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ProductFields } from "@/components/ProductFields";
import { createProduct } from "@/app/actions/products";
import { requireOwner } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getT } from "@/lib/lang";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  await requireOwner();
  const { added } = await searchParams;
  const { lang, t } = await getT();
  const cats = await sql`SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY 1`;
  return (
    <div className="space-y-3">
      <h1 className="h1">{t("addProduct")}</h1>
      {added && <p className="rounded-lg bg-green-50 p-2 text-sm text-green-700">✓ Saved / सेव हो गया</p>}
      <ActionForm action={createProduct} className="card space-y-4">
        <ProductFields t={t} lang={lang} isNew />
        <datalist id="categories">
          {cats.map((c) => (
            <option key={c.category} value={c.category} />
          ))}
        </datalist>
        <div className="flex gap-2">
          <SubmitButton className="btn-primary flex-1">{t("save")}</SubmitButton>
          <SubmitButton className="btn-secondary flex-1" name="again" value="1">
            {t("save")} + {t("add")}
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
