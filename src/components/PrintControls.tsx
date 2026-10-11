"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const SIZES = [
  { key: "58", label: "58mm" },
  { key: "80", label: "80mm" },
  { key: "a5", label: "A5" },
  { key: "a4", label: "A4" },
];

export function PrintControls({ id, size, lang }: { id: number; size: string; lang: string }) {
  const router = useRouter();
  return (
    <div className="no-print mx-auto mb-4 flex max-w-md flex-wrap items-center gap-2 p-3">
      <Link href={`/bills/${id}`} className="btn-secondary btn-sm">
        ← Back
      </Link>
      {SIZES.map((s) => (
        <button
          key={s.key}
          onClick={() => router.replace(`/print/bill/${id}?size=${s.key}&lang=${lang}`)}
          className={`btn btn-sm ${s.key === size ? "bg-stone-800 text-white" : "bg-stone-200"}`}
        >
          {s.label}
        </button>
      ))}
      <button onClick={() => router.replace(`/print/bill/${id}?size=${size}&lang=${lang === "hi" ? "en" : "hi"}`)} className="btn btn-sm bg-stone-200">
        {lang === "hi" ? "EN" : "हिं"}
      </button>
      <button onClick={() => window.print()} className="btn-primary btn-sm ml-auto">
        🖨️ Print
      </button>
    </div>
  );
}
