import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CustomerFields } from "@/components/CustomerFields";
import { Icon, type IconName } from "@/components/Icon";
import { adjustBalance, receivePayment, updateCustomer } from "@/app/actions/customers";
import { requireUser } from "@/lib/auth";
import { getSettings, num, sql, type Row } from "@/lib/db";
import { date, dateTime, money, waLink } from "@/lib/format";
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
  const lastPayment = [...ledger].reverse().find((l) => l.kind === "payment");
  const KIND: Record<string, { icon: IconName; tint: string }> = {
    bill: { icon: "orders", tint: "bg-red-50 text-red-600" },
    payment: { icon: "check", tint: "bg-green-50 text-green-600" },
    adjust: { icon: "book", tint: "bg-purple-50 text-purple-600" },
  };
  const reminder = `नमस्ते ${c.name} जी,\n${settings.shop_name_hi || settings.shop_name} में आपका बकाया ₹${due} है। कृपया जल्द जमा करें। धन्यवाद 🙏`;

  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 font-display text-2xl font-extrabold text-brand-700">
            {c.name.trim().charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="h1 truncate">{c.name}</h1>
            <p className="truncate text-sm text-muted">{[c.phone, c.area, c.address].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className={`flex items-center justify-between rounded-[18px] p-4 ${due > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          <div>
            <div className="text-[15px] font-medium">{t("balance")}</div>
            <div className="amount text-[38px] font-extrabold leading-none">{money(Math.abs(due))}</div>
            {due < 0 && <div className="text-sm">(advance / एडवांस)</div>}
          </div>
          {lastPayment && (
            <div className="text-right text-sm">
              {t("lastPaid")}
              <br />
              {date(lastPayment.created_at)}
            </div>
          )}
        </div>

        <details className="group" open={due > 0}>
          <summary className="btn-green min-h-[56px] w-full cursor-pointer rounded-[18px] font-display text-lg">
            <Icon name="cash" /> {t("receivePayment")}
          </summary>
          <ActionForm action={receivePayment} className="mt-3 space-y-3" resetOnOk>
            <input type="hidden" name="id" value={id} />
            <input name="amount" type="number" step="0.01" min="0" inputMode="decimal" className="input text-xl font-semibold" placeholder="₹" required />
            <div className="seg grid-cols-2">
              <label className="seg-btn flex cursor-pointer items-center justify-center gap-2 has-[:checked]:bg-white has-[:checked]:font-semibold">
                <input type="radio" name="mode" value="cash" defaultChecked /> {t("cash")}
              </label>
              <label className="seg-btn flex cursor-pointer items-center justify-center gap-2 has-[:checked]:bg-white has-[:checked]:font-semibold">
                <input type="radio" name="mode" value="upi" /> {t("upi")}
              </label>
            </div>
            <input name="note" className="input" placeholder={t("notes")} />
            <SubmitButton className="btn-green w-full">{t("save")}</SubmitButton>
          </ActionForm>
        </details>

        <div className="grid grid-cols-3 gap-2">
          {c.phone && due > 0 ? (
            <a href={waLink(c.phone, reminder)} target="_blank" className="btn-secondary btn-sm min-h-[48px] px-1 text-center leading-tight">
              <Icon name="chat" size={18} /> {t("sendReminder")}
            </a>
          ) : (
            <span />
          )}
          {c.phone ? (
            <a href={`tel:${c.phone}`} className="btn-secondary btn-sm min-h-[48px]">
              <Icon name="phone" size={18} /> Call
            </a>
          ) : (
            <span />
          )}
          <Link href={`/bills/new?customer=${id}`} className="btn-primary btn-sm min-h-[48px]">
            <Icon name="plus" size={18} /> {t("billLabel")}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="h2 mb-2 px-1 text-xl">{t("khata")}</h2>
        <div className="card py-1">
          {entries.length === 0 && <p className="muted py-3">{t("none")}</p>}
          {[...entries].reverse().map((l) => {
            const k = KIND[l.kind] ?? KIND.adjust;
            const content = (
              <>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.tint}`}>
                  <Icon name={k.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {t(`k_${l.kind}` as Key)}
                    {l.bill_no ? ` #${l.bill_no}` : ""}
                    {l.mode ? ` · ${t(l.mode as Key)}` : ""}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {dateTime(l.created_at)} · {l.by}
                    {l.note ? ` · ${l.note}` : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block font-bold ${num(l.amount) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {num(l.amount) > 0 ? "+" : "−"}
                    {money(Math.abs(num(l.amount)))}
                  </span>
                  <span className="block text-[13px] text-muted">= {money(l.running)}</span>
                </span>
              </>
            );
            return l.bill_id ? (
              <Link key={l.id} href={`/bills/${l.bill_id}`} className="flex items-center gap-3 border-b border-ground py-3 last:border-0">
                {content}
              </Link>
            ) : (
              <div key={l.id} className="flex items-center gap-3 border-b border-ground py-3 last:border-0">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {user.role === "owner" && (
        <details className="card">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold">
            <Icon name="book" size={20} className="text-purple-600" /> {t("adjustBalance")}
          </summary>
          <ActionForm action={adjustBalance} className="mt-3 space-y-3" resetOnOk>
            <p className="muted">{t("adjustHelp")}</p>
            <input type="hidden" name="id" value={id} />
            <div className="seg grid-cols-2">
              <label className="seg-btn flex cursor-pointer items-center justify-center gap-2 has-[:checked]:bg-white has-[:checked]:font-semibold">
                <input type="radio" name="sign" value="1" defaultChecked /> + {t("due")}
              </label>
              <label className="seg-btn flex cursor-pointer items-center justify-center gap-2 has-[:checked]:bg-white has-[:checked]:font-semibold">
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
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <Icon name="edit" size={20} className="text-muted" /> {t("edit")}
        </summary>
        <ActionForm action={updateCustomer} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={id} />
          <CustomerFields c={c} t={t} />
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </details>
    </div>
  );
}
