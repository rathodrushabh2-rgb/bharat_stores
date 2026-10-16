"use client";

import { useTransition } from "react";
import { setBillStatus } from "@/app/actions/bills";

/** One-tap "packed" / "delivered" for order cards. */
export function StatusButton({ id, to, label, className }: { id: number; to: "packed" | "delivered"; label: string; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button className={className ?? (to === "packed" ? "btn-blue flex-1" : "btn-green flex-1")} disabled={pending} onClick={() => start(() => setBillStatus(id, to))}>
      {pending ? "…" : label}
    </button>
  );
}
