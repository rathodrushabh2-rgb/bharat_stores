import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CustomerFields } from "@/components/CustomerFields";
import { createCustomer } from "@/app/actions/customers";
import { getT } from "@/lib/lang";

export default async function NewCustomerPage() {
  const { t } = await getT();
  return (
    <div className="space-y-3">
      <h1 className="h1">{t("addCustomer")}</h1>
      <ActionForm action={createCustomer} className="card space-y-4">
        <CustomerFields t={t} />
        <SubmitButton>{t("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
