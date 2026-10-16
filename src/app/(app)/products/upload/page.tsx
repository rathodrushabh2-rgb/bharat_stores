import { RateUpload } from "@/components/RateUpload";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/lang";

export default async function UploadRatesPage() {
  await requireOwner();
  const { lang, t } = await getT();
  return (
    <div className="space-y-3">
      <h1 className="h1">⬆️ {t("uploadRates")}</h1>
      <RateUpload lang={lang} />
    </div>
  );
}
