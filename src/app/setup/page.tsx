import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { setupOwner } from "@/app/actions/auth";
import { sql } from "@/lib/db";
import { getT } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users`;
  if (n > 0) redirect("/login");
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="h1 mb-1">{t("setupTitle")}</h1>
      <p className="muted mb-4">{t("setupHelp")}</p>
      <ActionForm action={setupOwner} className="card space-y-4">
        <div>
          <label className="label">{t("name")}</label>
          <input name="name" className="input" required />
        </div>
        <div>
          <label className="label">{t("username")} (a-z, 0-9)</label>
          <input name="username" className="input" autoCapitalize="none" required />
        </div>
        <div>
          <label className="label">{t("pin")} (4-6)</label>
          <input name="pin" type="password" inputMode="numeric" maxLength={6} className="input" required />
        </div>
        <div>
          <label className="label">{t("confirmPin")}</label>
          <input name="pin2" type="password" inputMode="numeric" maxLength={6} className="input" required />
        </div>
        <SubmitButton>{t("save")}</SubmitButton>
      </ActionForm>
    </main>
  );
}
