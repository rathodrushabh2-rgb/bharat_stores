import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { LangToggle } from "@/components/LangToggle";
import { OrderWatcher } from "@/components/OrderWatcher";
import { PushToggle } from "@/components/PushToggle";
import { requireUser } from "@/lib/auth";
import { getSettings, sql } from "@/lib/db";
import { getT } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { lang, t } = await getT();
  const [[orders], [wa], settings] = await Promise.all([
    sql`SELECT count(*)::int AS n, coalesce(max(id) FILTER (WHERE created_by IS DISTINCT FROM ${user.id}), 0)::int AS latest FROM bills WHERE status = 'new'`,
    sql`SELECT count(*)::int AS n FROM wa_messages WHERE status = 'new'`,
    getSettings(),
  ]);
  const hour = (v: string | undefined, d: number) => (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 23 && v !== "" ? Number(v) : d);
  return (
    <div className="min-h-screen pb-28">
      <header className="no-print sticky top-0 z-10 bg-ground/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-brand-600 font-display text-lg font-extrabold text-white">भा</span>
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold leading-tight">{t("appName")}</span>
              <span className="block truncate text-xs text-muted">
                {user.name} · {user.role === "owner" ? t("owner") : t("staffRole")}
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LangToggle lang={lang} />
            <Link href="/more" aria-label={t("more")} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-inset ring-line">
              <Icon name="menu" size={20} />
              {!!wa.n && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{wa.n}</span>}
            </Link>
          </div>
        </div>
      </header>
      <OrderWatcher
        latestNewId={orders.latest}
        openCount={orders.n}
        message={t("newOrderAlert")}
        quietFrom={hour(settings.quiet_from, 23)}
        quietTo={hour(settings.quiet_to, 9)}
      />
      <main className="mx-auto max-w-2xl px-4 pb-4 pt-1">
        <PushToggle lang={lang} banner />
        {children}
      </main>
      <BottomNav
        newBillLabel={t("newBill")}
        left={[
          { href: "/", label: t("home"), icon: "home" },
          { href: "/bills", label: t("orders"), icon: "orders", badge: orders.n },
        ]}
        right={[
          { href: "/products", label: t("products"), icon: "box" },
          { href: "/customers", label: t("customers"), icon: "users" },
        ]}
      />
    </div>
  );
}
