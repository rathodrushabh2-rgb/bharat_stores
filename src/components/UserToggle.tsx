"use client";

import { useTransition } from "react";
import { setUserActive } from "@/app/actions/admin";

export function UserToggle({ id, active, labels }: { id: number; active: boolean; labels: [string, string] }) {
  const [pending, start] = useTransition();
  return (
    <button className={`btn-sm btn ${active ? "bg-stone-100 text-red-600" : "bg-green-600 text-white"}`} disabled={pending} onClick={() => start(() => setUserActive(id, !active))}>
      {active ? labels[0] : labels[1]}
    </button>
  );
}
