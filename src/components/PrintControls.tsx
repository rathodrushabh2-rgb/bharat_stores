"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SIZES = [
  { key: "58", label: "58mm" },
  { key: "80", label: "80mm" },
  { key: "a5", label: "A5" },
  { key: "a4", label: "A4" },
  { key: "a4x2", label: "A4 · 2 कॉपी" },
];
const KEY = "bs_print_size";

/** Size picker; remembers the last size on this device so the shop printer's size is the default. */
export function PrintControls({ id, size, explicit }: { id: number; size: string; explicit: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (explicit) return;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && saved !== size && SIZES.some((s) => s.key === saved)) router.replace(`/print/bill/${id}?size=${saved}`);
    } catch {}
  }, [explicit, id, size, router]);

  function pick(key: string) {
    try {
      localStorage.setItem(KEY, key);
    } catch {}
    router.replace(`/print/bill/${id}?size=${key}`);
  }

  return (
    <div className="no-print mx-auto mb-4 flex max-w-md flex-wrap items-center gap-2 p-3">
      <Link href={`/bills/${id}`} className="btn-secondary btn-sm">
        ← Back
      </Link>
      {SIZES.map((s) => (
        <button key={s.key} onClick={() => pick(s.key)} className={`btn btn-sm ${s.key === size ? "bg-ink text-white" : "bg-white ring-1 ring-inset ring-line"}`}>
          {s.label}
        </button>
      ))}
      <button onClick={() => window.print()} className="btn-primary btn-sm ml-auto">
        Print / प्रिंट
      </button>
    </div>
  );
}
