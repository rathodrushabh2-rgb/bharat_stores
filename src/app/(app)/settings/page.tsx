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
        <SubmitButton>{t("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
