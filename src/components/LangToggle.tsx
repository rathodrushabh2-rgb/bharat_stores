"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLang } from "@/app/actions/auth";

export function LangToggle({ lang, className = "min-h-[40px] rounded-full bg-white px-3.5 text-sm font-semibold ring-1 ring-inset ring-line" }: { lang: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setLang(lang === "hi" ? "en" : "hi");
          router.refresh();
        })
      }
    >
      {lang === "hi" ? "हिं · EN" : "EN · हिं"}
    </button>
  );
}
