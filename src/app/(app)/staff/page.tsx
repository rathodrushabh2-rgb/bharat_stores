import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { UserToggle } from "@/components/UserToggle";
import { addUser, resetUserPin } from "@/app/actions/admin";
import { requireOwner } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getT } from "@/lib/lang";

export default async function StaffPage() {
  const me = await requireOwner();
  const { t } = await getT();
  const users = await sql`SELECT id, name, username, role, active FROM users ORDER BY active DESC, role, name`;
  return (
    <div className="space-y-4">
      <h1 className="h1">{t("staff")}</h1>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className={`card ${u.active ? "" : "opacity-50"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{u.name}</div>
                <div className="muted">
                  @{u.username} · {u.role === "owner" ? t("owner") : t("staffRole")}
                </div>
              </div>
              {u.id !== me.id && <UserToggle id={u.id} active={u.active} labels={[t("deactivate"), t("activate")]} />}
            </div>
            {u.id !== me.id && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-brand-700">{t("resetPin")}</summary>
                <ActionForm action={resetUserPin} className="mt-2 flex gap-2" resetOnOk>
                  <input type="hidden" name="id" value={u.id} />
                  <input name="pin" type="password" inputMode="numeric" maxLength={6} className="input" placeholder="4-6" required />
                  <SubmitButton className="btn-primary">{t("save")}</SubmitButton>
                </ActionForm>
              </details>
            )}
          </div>
        ))}
      </div>
      <section className="card">
        <h2 className="h2 mb-3">+ {t("addStaff")}</h2>
        <ActionForm action={addUser} className="space-y-3" resetOnOk>
          <input name="name" className="input" placeholder={t("name")} required />
          <input name="username" className="input" placeholder={`${t("username")} (a-z, 0-9)`} autoCapitalize="none" required />
          <input name="pin" type="password" inputMode="numeric" maxLength={6} className="input" placeholder={`${t("pin")} (4-6)`} required />
          <select name="role" className="input" defaultValue="staff">
            <option value="staff">{t("staffRole")}</option>
            <option value="owner">{t("owner")}</option>
          </select>
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
