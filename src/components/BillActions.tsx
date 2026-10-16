"use client";

import { useTransition } from "react";
import { cancelBill, setBillStatus } from "@/app/actions/bills";
import { translator, type Lang } from "@/lib/i18n";

export function BillActions({ id, status, isOwner, lang }: { id: number; status: string; isOwner: boolean; lang: Lang }) {
  const t = translator(lang);
  const [pending, start] = useTransition();
  if (status === "cancelled") return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {status === "new" && (
        <button className="btn-blue" disabled={pending} onClick={() => start(() => setBillStatus(id, "packed"))}>
          {t("markPacked")}
        </button>
      )}
      {(status === "new" || status === "packed") && (
        <button className="btn-green" disabled={pending} onClick={() => start(() => setBillStatus(id, "delivered"))}>
          {t("markDelivered")}
        </button>
      )}
      {isOwner && (
        <button
          className="btn-secondary col-span-2 !text-red-600"
          disabled={pending}
          onClick={() => {
            const reason = window.prompt(t("confirmCancel") + "\n\nReason / कारण:");
            if (reason !== null) start(() => cancelBill(id, reason));
          }}
        >
          {t("cancelBill")}
        </button>
      )}
    </div>
  );
}
