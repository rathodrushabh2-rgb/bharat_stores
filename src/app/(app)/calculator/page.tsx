import { Calculator } from "@/components/Calculator";
import { getSettings, num, sql } from "@/lib/db";
import { getT } from "@/lib/lang";
import { ruleFromSettings } from "@/lib/pricing";

export default async function CalculatorPage() {
  const { lang, t } = await getT();
  const [products, settings] = await Promise.all([sql`SELECT id, name, name_hi, unit, price FROM products WHERE active ORDER BY name`, getSettings()]);
  return (
    <div className="space-y-3">
      <h1 className="h1">{t("calcTitle")}</h1>
      <Calculator
        products={products.map((p) => ({ id: p.id, name: p.name, name_hi: p.name_hi, unit: p.unit, price: num(p.price) }))}
        rule={ruleFromSettings(settings)}
        lang={lang}
      />
    </div>
  );
}
