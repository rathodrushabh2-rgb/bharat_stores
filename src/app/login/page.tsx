import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { LangToggle } from "@/components/LangToggle";
import { login } from "@/app/actions/auth";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getT } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users`;
  if (n === 0) redirect("/setup");
  const { lang, t } = await getT();
  return (
    <main className="relative mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <div className="absolute right-6 top-6">
        <LangToggle lang={lang} />
      </div>
      <div className="mb-6 text-center">
        <img src="/icon.svg" alt="" className="mx-auto mb-3 h-16 w-16" />
        <h1 className="text-2xl font-bold">भारत स्टोर्स</h1>
        <p className="muted">Bharat Stores</p>
      </div>
      <ActionForm action={login} className="card space-y-4">
        <div>
          <label className="label">{t("username")}</label>
          <input name="username" className="input" autoCapitalize="none" autoComplete="username" required />
        </div>
        <div>
          <label className="label">{t("pin")}</label>
          <input name="pin" type="password" inputMode="numeric" pattern="\d*" maxLength={6} className="input text-center text-2xl tracking-[.5em]" autoComplete="current-password" required />
        </div>
        <SubmitButton>{t("login")}</SubmitButton>
      </ActionForm>
    </main>
  );
}
