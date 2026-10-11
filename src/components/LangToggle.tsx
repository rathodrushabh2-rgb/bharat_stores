"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLang } from "@/app/actions/auth";

export function LangToggle({ lang, className = "rounded-md bg-white/20 px-2 py-1 text-sm font-semibold" }: { lang: string; className?: string }) {
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
      {lang === "hi" ? "EN" : "हिं"}
    </button>
  );
}
