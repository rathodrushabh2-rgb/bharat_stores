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
        <label className="flex items-center gap-2 rounded-lg bg-stone-50 p-3">
          <input type="checkbox" name="staff_can_edit_rate" defaultChecked={s.staff_can_edit_rate === "1"} className="h-5 w-5" />
          {t("staffCanEditRate")}
        </label>
        <SubmitButton>{t("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
