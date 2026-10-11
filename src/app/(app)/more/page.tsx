import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { LangToggle } from "@/components/LangToggle";
import { changeMyPin, logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getT } from "@/lib/lang";

export default async function MorePage() {
  const user = await requireUser();
  const { lang, t } = await getT();
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM wa_messages WHERE status = 'new'`;
  const owner = user.role === "owner";
  const items: { href: string; label: string; icon: string; badge?: number; show: boolean }[] = [
    { href: "/udhaar", label: t("udhaarList"), icon: "📒", show: true },
    { href: "/whatsapp", label: t("whatsappInbox"), icon: "💬", badge: n, show: true },
    { href: "/products/prices", label: t("priceList"), icon: "₹", show: owner },
    { href: "/audit", label: t("auditLog"), icon: "🔍", show: owner },
    { href: "/staff", label: t("staff"), icon: "👤", show: owner },
    { href: "/settings", label: t("settings"), icon: "⚙️", show: owner },
  ];
  return (
    <div className="space-y-4">
      <div className="card p-0">
        {items
          .filter((i) => i.show)
          .map((i) => (
            <Link key={i.href} href={i.href} className="list-row px-4 py-3.5">
              <span className="text-base">
                <span className="mr-3 inline-block w-6 text-center">{i.icon}</span>
                {i.label}
              </span>
              {!!i.badge && <span className="badge bg-red-600 text-white">{i.badge}</span>}
            </Link>
          ))}
        <div className="list-row px-4 py-3.5">
          <span>{t("language")}</span>
          <LangToggle lang={lang} className="btn-secondary btn-sm" />
        </div>
      </div>

      <details className="card">
        <summary className="h2 cursor-pointer">🔑 {t("changeMyPin")}</summary>
        <ActionForm action={changeMyPin} className="mt-3 space-y-3" resetOnOk>
          <input name="old" type="password" inputMode="numeric" maxLength={6} className="input" placeholder={`Old ${t("pin")}`} required />
          <input name="pin" type="password" inputMode="numeric" maxLength={6} className="input" placeholder={`New ${t("pin")} (4-6)`} required />
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </details>

      <form action={logout}>
        <button className="btn-secondary w-full text-red-600">{t("logout")}</button>
      </form>
    </div>
  );
}
