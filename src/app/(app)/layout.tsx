import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { LangToggle } from "@/components/LangToggle";
import { OrderWatcher } from "@/components/OrderWatcher";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getT } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { lang, t } = await getT();
  const [[orders], [wa]] = await Promise.all([
    sql`SELECT count(*)::int AS n, coalesce(max(id) FILTER (WHERE created_by IS DISTINCT FROM ${user.id}), 0)::int AS latest FROM bills WHERE status = 'new'`,
    sql`SELECT count(*)::int AS n FROM wa_messages WHERE status = 'new'`,
  ]);
  return (
    <div className="min-h-screen pb-24">
      <header className="no-print sticky top-0 z-10 bg-brand-600 text-white shadow">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold">
            {t("appName")}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-90">
              {user.name} · {user.role === "owner" ? t("owner") : t("staffRole")}
            </span>
            <LangToggle lang={lang} />
          </div>
        </div>
      </header>
      <OrderWatcher latestNewId={orders.latest} message={t("newOrderAlert")} />
      <main className="mx-auto max-w-2xl p-4">{children}</main>
      <BottomNav
        tabs={[
          { href: "/", label: t("home"), icon: "🏠" },
          { href: "/bills", label: t("bills"), icon: "🧾", badge: orders.n },
          { href: "/products", label: t("products"), icon: "📦" },
          { href: "/customers", label: t("customers"), icon: "👥" },
          { href: "/more", label: t("more"), icon: "☰", badge: wa.n },
        ]}
      />
    </div>
  );
}
