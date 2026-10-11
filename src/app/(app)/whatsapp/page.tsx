import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { WaIgnore } from "@/components/WaIgnore";
import { addWaMessage } from "@/app/actions/whatsapp";
import { sql } from "@/lib/db";
import { dateTime } from "@/lib/format";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const { t } = await getT();
  const rows = all
    ? await sql`SELECT w.*, b.bill_no FROM wa_messages w LEFT JOIN bills b ON b.id = w.bill_id ORDER BY w.id DESC LIMIT 100`
    : await sql`SELECT w.*, NULL AS bill_no FROM wa_messages w WHERE status = 'new' ORDER BY w.id`;
  return (
    <div className="space-y-3">
      <h1 className="h1">💬 {t("whatsappInbox")}</h1>
      <div className="flex gap-2 text-sm">
        <Link href="/whatsapp" className={`badge ${!all ? "bg-brand-600 text-white" : "bg-white ring-1 ring-stone-300"}`}>
          {t("wa_new")}
        </Link>
        <Link href="/whatsapp?all=1" className={`badge ${all ? "bg-brand-600 text-white" : "bg-white ring-1 ring-stone-300"}`}>
          {t("all")}
        </Link>
      </div>
      {rows.length === 0 && <p className="card muted">{t("none")}</p>}
      {rows.map((m) => (
        <div key={m.id} className="card">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">
              {m.from_name ?? "—"} {m.from_phone}
            </span>
            <span className="muted">{dateTime(m.received_at)}</span>
          </div>
          <p className="my-2 whitespace-pre-wrap">{m.body}</p>
          {m.status === "new" ? (
            <div className="flex gap-2">
              <Link href={`/bills/new?wa=${m.id}`} className="btn-primary btn-sm">
                🧾 {t("makeBill")}
              </Link>
              <WaIgnore id={m.id} label={t("ignore")} />
            </div>
          ) : (
            <div className="text-sm">
              {t(`wa_${m.status}` as Key)}
              {m.bill_id && (
                <Link href={`/bills/${m.bill_id}`} className="ml-2 text-brand-700 underline">
                  #{m.bill_no}
                </Link>
              )}
            </div>
          )}
        </div>
      ))}
      <details className="card">
        <summary className="h2 cursor-pointer">+ {t("addMessage")}</summary>
        <ActionForm action={addWaMessage} className="mt-3 space-y-3" resetOnOk>
          <input name="name" className="input" placeholder={t("name")} />
          <input name="phone" type="tel" className="input" placeholder={t("phone")} />
          <textarea name="body" rows={4} className="input" placeholder={t("message")} required />
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </details>
    </div>
  );
}
