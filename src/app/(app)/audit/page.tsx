import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { AUDIT_ACTIONS, type Key } from "@/lib/i18n";
import { getT } from "@/lib/lang";

const LINKS: Record<string, string> = { bill: "/bills/", product: "/products/", customer: "/customers/" };
const ENTITY: Record<string, Key> = { bill: "billLabel", product: "product", customer: "customer", user: "userLabel", settings: "settingsLabel", wa_message: "whatsappInbox" };
// Detail fields shown with a translated label; others keep their own name.
const FIELDS: Record<string, Key> = {
  total: "total", paid: "paid", mode: "payment", items: "itemsCount", name: "name", price: "price", amount: "amount",
  note: "notes", reason: "reason", qty: "qty", stock: "stock", unit: "unit", username: "username", role: "role",
  from: "lastRate", to: "rate", cost: "costPrice", category: "category", updated: "updated", created: "created", errors: "skipped",
  customerId: "customer", rate_changes: "rateChanged", amount_overrides: "amountOverride", price_changes: "pricesUpdated",
  list: "listRate", billed: "rate", calculated: "amount", bill_no: "billNo",
};
// Stored values that have a translation (payment modes, roles).
const VALUES: Record<string, Key> = { cash: "cash", upi: "upi", credit: "credit", partial: "partial", owner: "owner", staff: "staffRole" };

function show(v: unknown, t: (k: Key) => string): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.map((x) => show(x, t)).join("; ");
  if (typeof v === "object")
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${FIELDS[k] ? t(FIELDS[k]) : k} ${show(x, t)}`)
      .join(", ");
  if (typeof v === "string" && VALUES[v]) return t(VALUES[v]);
  return String(v);
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireOwner();
  const { lang, t } = await getT();
  const page = Math.max(0, Number((await searchParams).page ?? 0) || 0);
  const rows = await sql`SELECT a.*, u.name AS by FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 100 OFFSET ${page * 100}`;
  return (
    <div className="space-y-3">
      <h1 className="h1">{t("auditLog")}</h1>
      {rows.length === 0 && <p className="card muted">{t("none")}</p>}
      <div className="card p-0 text-sm">
        {rows.map((a) => {
          const details =
            a.details && typeof a.details === "object" && !Array.isArray(a.details)
              ? Object.entries(a.details as Record<string, unknown>).filter(([, v]) => !(Array.isArray(v) && v.length === 0) && v !== null)
              : [];
          return (
            <div key={a.id} className="border-b border-ground px-4 py-3 last:border-0">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{AUDIT_ACTIONS[a.action]?.[lang] ?? a.action.replaceAll("_", " ")}</span>
                <span className="muted shrink-0">{dateTime(a.created_at, lang)}</span>
              </div>
              <div className="muted">
                {a.by}
                {a.entity && LINKS[a.entity] && a.entity_id && (
                  <>
                    {" · "}
                    <Link className="font-semibold text-brand-600" href={LINKS[a.entity] + a.entity_id}>
                      {ENTITY[a.entity] ? t(ENTITY[a.entity]) : a.entity} #{a.entity_id}
                    </Link>
                  </>
                )}
              </div>
              {details.length > 0 && (
                <div className="mt-1 break-all text-xs text-muted">
                  {details.map(([k, v]) => (
                    <span key={k} className="mr-3 inline-block">
                      {FIELDS[k] ? t(FIELDS[k]) : k}: <b className="font-semibold text-ink">{show(v, t)}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        {page > 0 ? (
          <Link href={`/audit?page=${page - 1}`} className="btn-secondary btn-sm">
            ← {t("newer")}
          </Link>
        ) : (
          <span />
        )}
        {rows.length === 100 && (
          <Link href={`/audit?page=${page + 1}`} className="btn-secondary btn-sm">
            {t("older")} →
          </Link>
        )}
      </div>
    </div>
  );
}
