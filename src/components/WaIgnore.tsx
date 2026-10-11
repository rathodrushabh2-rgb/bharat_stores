"use client";

import { useTransition } from "react";
import { setWaStatus } from "@/app/actions/whatsapp";

export function WaIgnore({ id, label }: { id: number; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-secondary btn-sm" disabled={pending} onClick={() => start(() => setWaStatus(id, "ignored"))}>
      {label}
    </button>
  );
}
