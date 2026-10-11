import type { Key } from "@/lib/i18n";
import type { Row } from "@/lib/db";

export function CustomerFields({ c, t }: { c?: Row; t: (k: Key) => string }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">{t("name")} *</label>
        <input name="name" className="input" defaultValue={c?.name} required />
      </div>
      <div>
        <label className="label">{t("phone")}</label>
        <input name="phone" type="tel" inputMode="tel" className="input" defaultValue={c?.phone ?? ""} placeholder="98XXXXXXXX" />
      </div>
      <div>
        <label className="label">{t("address")}</label>
        <textarea name="address" rows={2} className="input" defaultValue={c?.address ?? ""} />
      </div>
      <div>
        <label className="label">{t("area")}</label>
        <input name="area" className="input" defaultValue={c?.area ?? ""} />
      </div>
      <div>
        <label className="label">{t("notes")}</label>
        <input name="notes" className="input" defaultValue={c?.notes ?? ""} />
      </div>
    </div>
  );
}
