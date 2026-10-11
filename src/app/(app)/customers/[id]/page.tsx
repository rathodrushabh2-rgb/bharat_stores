import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CustomerFields } from "@/components/CustomerFields";
import { adjustBalance, receivePayment, updateCustomer } from "@/app/actions/customers";
import { requireUser } from "@/lib/auth";
import { getSettings, num, sql, type Row } from "@/lib/db";
import { dateTime, money, waLink } from "@/lib/format";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const user = await requireUser();
  const { t } = await getT();
  const [[c], ledger, settings] = await Promise.all([
    sql`SELECT * FROM customers WHERE id = ${id}`,
    sql`SELECT l.*, u.name AS by, b.bill_no FROM ledger l LEFT JOIN users u ON u.id = l.created_by LEFT JOIN bills b ON b.id = l.bill_id
        WHERE l.customer_id = ${id} ORDER BY l.created_at, l.id`,
    getSettings(),
  ]);
  if (!c) notFound();

  let running = 0;
  const entries = ledger.map((l): Row => ({ ...l, running: (running = Math.round((running + num(l.amount)) * 100) / 100) }));
  const due = running;
  const reminder = `नमस्ते ${c.name} जी,\n${settings.shop_name_hi || settings.shop_name} में आपका बकाया ₹${due} है। कृपया जल्द जमा करें। धन्यवाद 🙏`;

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="h1">{c.name}</h1>
        <p className="muted">{[c.phone, c.area].filter(Boolean).join(" · ")}</p>
        {c.address && <p className="mt-1 text-sm">📍 {c.address}</p>}
        <div className={`mt-3 rounded-lg p-3 text-center ${due > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          <div className="muted">{t("balance")}</div>
          <div className="text-3xl font-bold">{money(Math.abs(due))}</div>
          {due < 0 && <div className="text-sm">(advance / एडवांस)</div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/bills/new?customer=${id}`} className="btn-primary btn-sm">
            + {t("newBill")}
          </Link>
          {c.phone && (
            <a href={`tel:${c.phone}`} className="btn-secondary btn-sm">
              📞 Call
            </a>
          )}
          {c.phone && due > 0 && (
            <a href={waLink(c.phone, reminder)} target="_blank" className="btn-green btn-sm">
              WhatsApp {t("sendReminder")}
            </a>
          )}
        </div>
      </div>

      <details className="card" open={due > 0}>
        <summary className="h2 cursor-pointer">💰 {t("receivePayment")}</summary>
        <ActionForm action={receivePayment} className="mt-3 space-y-3" resetOnOk>
          <input type="hidden" name="id" value={id} />
          <input name="amount" type="number" step="0.01" min="0" inputMode="decimal" className="input text-xl" placeholder="₹" required />
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" value="cash" defaultChecked /> {t("cash")}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" value="upi" /> {t("upi")}
            </label>
          </div>
          <input name="note" className="input" placeholder={t("notes")} />
          <SubmitButton className="btn-green w-full">{t("save")}</SubmitButton>
        </ActionForm>
      </details>

      <section className="card">
        <h2 className="h2 mb-2">{t("khata")}</h2>
        {entries.length === 0 && <p className="muted">{t("none")}</p>}
        <div className="divide-y divide-stone-100 text-sm">
          {[...entries].reverse().map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="font-medium">
                  {l.bill_id ? (
                    <Link href={`/bills/${l.bill_id}`} className="text-brand-700 underline">
                      {t(`k_${l.kind}` as Key)} #{l.bill_no}
                    </Link>
                  ) : (
                    t(`k_${l.kind}` as Key)
                  )}
                  {l.mode ? ` · ${t(l.mode as Key)}` : ""}
                </div>
                <div className="muted truncate">
                  {dateTime(l.created_at)} · {l.by}
                  {l.note ? ` · ${l.note}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${num(l.amount) > 0 ? "text-red-600" : "text-green-700"}`}>
                  {num(l.amount) > 0 ? "+" : "−"}
                  {money(Math.abs(num(l.amount)))}
                </div>
                <div className="muted">= {money(l.running)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {user.role === "owner" && (
        <details className="card">
          <summary className="h2 cursor-pointer">⚖️ {t("adjustBalance")}</summary>
          <ActionForm action={adjustBalance} className="mt-3 space-y-3" resetOnOk>
            <p className="muted">{t("adjustHelp")}</p>
            <input type="hidden" name="id" value={id} />
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="sign" value="1" defaultChecked /> + {t("due")}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="sign" value="-1" /> − {t("due")}
              </label>
            </div>
            <input name="amount" type="number" step="0.01" min="0" inputMode="decimal" className="input" placeholder="₹" required />
            <input name="note" className="input" placeholder={t("notes") + " *"} required />
            <SubmitButton>{t("save")}</SubmitButton>
          </ActionForm>
        </details>
      )}

      <details className="card">
        <summary className="h2 cursor-pointer">✏️ {t("edit")}</summary>
        <ActionForm action={updateCustomer} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={id} />
          <CustomerFields c={c} t={t} />
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </details>
    </div>
  );
}
