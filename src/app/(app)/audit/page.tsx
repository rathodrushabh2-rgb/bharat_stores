import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { getT } from "@/lib/lang";

const LINKS: Record<string, string> = { bill: "/bills/", product: "/products/", customer: "/customers/" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireOwner();
  const { t } = await getT();
  const page = Math.max(0, Number((await searchParams).page ?? 0) || 0);
  const rows = await sql`SELECT a.*, u.name AS by FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 100 OFFSET ${page * 100}`;
  return (
    <div className="space-y-3">
      <h1 className="h1">{t("auditLog")}</h1>
      <div className="card p-0 text-sm">
        {rows.map((a) => (
          <div key={a.id} className="border-b border-stone-100 px-4 py-2 last:border-0">
            <div className="flex justify-between">
              <span className="font-semibold">{a.action.replaceAll("_", " ")}</span>
              <span className="muted">{dateTime(a.created_at)}</span>
            </div>
            <div className="muted">
              {a.by}
              {a.entity && LINKS[a.entity] && a.entity_id && (
                <>
                  {" · "}
                  <Link className="text-brand-700 underline" href={LINKS[a.entity] + a.entity_id}>
                    {a.entity} {a.entity_id}
                  </Link>
                </>
              )}
            </div>
            {a.details && <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-xs text-stone-500">{JSON.stringify(a.details)}</pre>}
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        {page > 0 ? <Link href={`/audit?page=${page - 1}`} className="btn-secondary btn-sm">← Newer</Link> : <span />}
        {rows.length === 100 && <Link href={`/audit?page=${page + 1}`} className="btn-secondary btn-sm">Older →</Link>}
      </div>
    </div>
  );
}
