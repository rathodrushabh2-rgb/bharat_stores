import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { saveSettings } from "@/app/actions/admin";
import { requireOwner } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/lang";

const FIELDS: [string, Key][] = [
  ["shop_name", "shopName"],
  ["shop_name_hi", "shopNameHi"],
  ["shop_address", "shopAddress"],
  ["shop_phone", "shopPhone"],
  ["gstin", "gstin"],
  ["bill_footer", "billFooter"],
];

export default async function SettingsPage() {
  await requireOwner();
  const { t } = await getT();
  const s = await getSettings();
  return (
    <div className="space-y-3">
      <h1 className="h1">{t("settings")}</h1>
      <ActionForm action={saveSettings} className="card space-y-3">
        {FIELDS.map(([k, label]) => (
          <div key={k}>
            <label className="label">{t(label)}</label>
            <input name={k} className="input" defaultValue={s[k] ?? ""} />
          </div>
        ))}
        <label className="flex items-center gap-2 rounded-2xl bg-ground p-3">
          <input type="checkbox" name="staff_can_edit_rate" defaultChecked={s.staff_can_edit_rate === "1"} className="h-5 w-5" />
          {t("staffCanEditRate")}
        </label>
        <fieldset className="space-y-2 rounded-2xl bg-ground p-3">
          <legend className="text-sm font-semibold">{t("quietHours")}</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("quietFrom")}</label>
              <input name="quiet_from" type="number" min="0" max="23" inputMode="numeric" className="input" defaultValue={s.quiet_from ?? "23"} />
            </div>
            <div>
              <label className="label">{t("quietTo")}</label>
              <input name="quiet_to" type="number" min="0" max="23" inputMode="numeric" className="input" defaultValue={s.quiet_to ?? "9"} />
            </div>
          </div>
        </fieldset>
        <fieldset className="space-y-2 rounded-2xl bg-ground p-3">
          <legend className="text-sm font-semibold">{t("smallQtyRule")}</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("smallQtyExtraLabel")}</label>
              <input name="small_qty_extra" type="number" step="0.01" min="0" inputMode="decimal" className="input" defaultValue={s.small_qty_extra ?? "4"} />
            </div>
            <div>
              <label className="label">{t("smallQtyUptoLabel")}</label>
              <input name="small_qty_upto_g" type="number" step="1" min="0" inputMode="numeric" className="input" defaultValue={s.small_qty_upto_g ?? "250"} />
            </div>
          </div>
        </fieldset>
        <SubmitButton>{t("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
