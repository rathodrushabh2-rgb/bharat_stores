import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Icon, type IconName } from "@/components/Icon";
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
  const items: { href: string; label: string; icon: IconName; tint: string; badge?: number; show: boolean }[] = [
    { href: "/udhaar", label: t("udhaarList"), icon: "book", tint: "bg-red-50 text-red-600", show: true },
    { href: "/whatsapp", label: t("whatsappInbox"), icon: "chat", tint: "bg-green-50 text-green-600", badge: n, show: true },
    { href: "/products/prices", label: t("priceList"), icon: "tag", tint: "bg-purple-50 text-purple-600", show: owner },
    { href: "/products/upload", label: t("uploadRates"), icon: "upload", tint: "bg-blue-50 text-blue-600", show: owner },
    { href: "/audit", label: t("auditLog"), icon: "shield", tint: "bg-amber-50 text-amber-700", show: owner },
    { href: "/staff", label: t("staff"), icon: "users", tint: "bg-brand-100 text-brand-600", show: owner },
    { href: "/settings", label: t("settings"), icon: "settings", tint: "bg-ground text-ink", show: owner },
  ];
  return (
    <div className="space-y-4">
      <div className="card p-0">
        {items
          .filter((i) => i.show)
          .map((i) => (
            <Link key={i.href} href={i.href} className="list-row px-4 py-3.5">
              <span className="text-base">
                <span className={`mr-3 inline-flex h-10 w-10 items-center justify-center rounded-xl align-middle ${i.tint}`}>
                  <Icon name={i.icon} size={20} />
                </span>
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
        <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Icon name="key" size={20} className="text-muted" /> {t("changeMyPin")}</summary>
        <ActionForm action={changeMyPin} className="mt-3 space-y-3" resetOnOk>
          <input name="old" type="password" inputMode="numeric" maxLength={6} className="input" placeholder={`Old ${t("pin")}`} required />
          <input name="pin" type="password" inputMode="numeric" maxLength={6} className="input" placeholder={`New ${t("pin")} (4-6)`} required />
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </details>

      <form action={logout}>
        <button className="btn-secondary w-full !text-red-600"><Icon name="logout" size={20} /> {t("logout")}</button>
      </form>
    </div>
  );
}
